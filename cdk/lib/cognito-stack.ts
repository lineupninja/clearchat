/* eslint-disable @typescript-eslint/no-unused-vars */
import { Stack, StackProps, Construct, CfnOutput } from '@aws-cdk/core';
import { UserPool, UserPoolClient, CfnIdentityPool, CfnIdentityPoolRoleAttachment, CfnUserPoolResourceServer } from '@aws-cdk/aws-cognito';
import { PolicyStatement, PolicyDocument, Role, FederatedPrincipal } from '@aws-cdk/aws-iam';
import { PublicHostedZone } from '@aws-cdk/aws-route53';

export interface CognitoStackProps extends StackProps {
    hostedZone: PublicHostedZone;
    namePrefix: string;
}

export type CognitoService = {
    readonly userPool: UserPool;
};

export class CognitoStack extends Stack {

    readonly cognito!: CognitoService;

    constructor(scope: Construct, id: string, props: CognitoStackProps) {
        super(scope, id, props);

        // Cognito UserPool
        const cognitoUserPool = new UserPool(this, 'CognitoUserPool', {
            userPoolName: `${props.namePrefix}-UserPool`,
            autoVerify: { email: true },
            selfSignUpEnabled: false,
            signInAliases: { email: true },
        });

        const userPoolClient = new UserPoolClient(this, 'CognitoUserPoolAppClientMobile', {
            userPool: cognitoUserPool,
            userPoolClientName: props.namePrefix,
        });

        // An Identity Pool for users to gain credentials for access to other AWS services
        const identityPool = new CfnIdentityPool(this, 'CognitoIdentityPool', {
            identityPoolName: `${props.namePrefix}-IdentityPool`,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: cognitoUserPool.userPoolProviderName,
                    serverSideTokenCheck: true,
                },
            ],
            allowUnauthenticatedIdentities: true,
        });

        new CfnOutput(this, 'CognitoIdentityPoolId', {
            value: identityPool.ref,
        });

        const apiGatewayInvoke = new PolicyStatement();
        apiGatewayInvoke.sid = 'InvokeUserAPIGateway';
        apiGatewayInvoke.addResources('arn:*:execute-api:*:*:*/ws-user/*');
        apiGatewayInvoke.addActions('execute-api:Invoke');

        const connectionAuthInvoke = new PolicyStatement();
        connectionAuthInvoke.sid = 'InvokeConnectionAuthLambda';
        connectionAuthInvoke.addResources(`arn:*:lambda:*:*:function:${props.namePrefix}-ConnectionAuthHandler`);
        connectionAuthInvoke.addActions('lambda:InvokeFunction');

        const authenticatedPolicy = new PolicyDocument({
            statements: [
                apiGatewayInvoke,
                connectionAuthInvoke,
            ],
        });

        const unauthenticatedPolicy = new PolicyDocument({
            statements: [
                apiGatewayInvoke,
                connectionAuthInvoke,
            ],
        });

        const userPoolAuthenticatedFederatedPrincipal = new FederatedPrincipal('cognito-identity.amazonaws.com', {
            StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
            'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' },
        }, 'sts:AssumeRoleWithWebIdentity');

        const authenticatedRole = new Role(this, 'CognitoAuthenticatedRole', {
            assumedBy: userPoolAuthenticatedFederatedPrincipal,
            inlinePolicies: { authenticatedPolicy },
        });

        const userPoolUnAuthenticatedFederatedPrincipal = new FederatedPrincipal('cognito-identity.amazonaws.com', {
            StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
            'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'unauthenticated' },
        }, 'sts:AssumeRoleWithWebIdentity');


        // UnAuthenticated Role
        const unauthenticatedRole = new Role(this, 'CognitoUnAuthenticatedRole', {
            assumedBy: userPoolUnAuthenticatedFederatedPrincipal,
            inlinePolicies: { unauthenticatedPolicy },

        });


        new CfnIdentityPoolRoleAttachment(this, 'CognitoIdentityPoolRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {
                unauthenticated: unauthenticatedRole.roleArn,
                authenticated: authenticatedRole.roleArn,
            },
        });


        // Security for cognitoUserPoolHandler is defined in LambdaSecurityStack

        this.cognito = {
            userPool: cognitoUserPool,
        };

    }
}
