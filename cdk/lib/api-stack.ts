/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { CfnApi, CfnIntegration, CfnRoute, CfnDeployment, CfnStage, CfnDomainName, CfnApiMapping } from '@aws-cdk/aws-apigatewayv2';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { ServicePrincipal, PolicyStatement, Role, ManagedPolicy } from '@aws-cdk/aws-iam';
import { Duration, Fn, RemovalPolicy, CfnOutput } from '@aws-cdk/core';
import { PublicHostedZone, CnameRecord } from '@aws-cdk/aws-route53';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';
import * as path from 'path';
import { CfnAccount } from '@aws-cdk/aws-apigateway';
import { RetainedLambdaLayerVersion } from './utils/retained-lambda-layer';
import { DynamoTables } from './dynamo-stack';
import { Certificates } from '../bin/cdk';

export interface ApiStackProps extends cdk.StackProps {
    hostedZone: PublicHostedZone;
    certificates: Certificates;
    namePrefix: string;
    tables: DynamoTables;
}

const compiledLambdaDir = path.join(__dirname, '../../backend/dist/');

const logFormat = '{ "requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod", "status":"$context.status", "protocol":"$context.protocol", "responseLength":"$context.responseLength"}';

export class ApiStack extends cdk.Stack {

    readonly wsApi: CfnApi;

    readonly httpApi: CfnApi;

    constructor(scope: cdk.Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);


        // The current time is used to force a new deployment of the API gateways
        const now = new Date().getTime();

        // The Role used by API gateway is set once per account
        // This is exposed in APIGatewayV1

        const logRole = new Role(this, 'APIGatewayLogRole', {
            assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')],
        });
        new CfnAccount(this, 'APIGatewayAccount', {
            cloudWatchRoleArn: logRole.roleArn,
        });

        // Create the Websocket API here, it is referenced from the lambda environment

        const wsApi = new CfnApi(this, 'WebSocketApi', {
            name: `${props.namePrefix}-WebSocketApi`,
            protocolType: 'WEBSOCKET',
            routeSelectionExpression: '$request.body.request',
        });

        const handlerDependenciesLayer = new RetainedLambdaLayerVersion(this, 'HandlerDependencies', {
            contentLocation: 'backend-dependencies-layer',
            description: 'Dependencies layer',
            compatibleRuntimes: [Runtime.NODEJS_12_X],
        });

        const sendgridKey = process.env.SENDGRID_API_KEY;
        if (!sendgridKey) {
            throw Error('SENDGRID_API_KEY must be supplied in environment');
        }

        const environment = {
            ADMIN_CONNECTIONS_TABLE: props.tables.adminConnectionsTable.tableName,
            CONNECTIONS_TABLE: props.tables.connectionsTable.tableName,
            CONNECTIONS_TABLE_ROOM_USER_INDEX: props.tables.connectionsTableRoomUserIndexName,
            GUESTS_TABLE: props.tables.guestsTable.tableName,
            MESSAGES_TABLE: props.tables.messagesTable.tableName,
            MESSAGES_ROOM_USER_INDEX: props.tables.messagesTableRoomUserIndexName,
            ROOMS_TABLE: props.tables.roomsTable.tableName,
            SENDGRID_API_KEY: sendgridKey,
            USER_CONNECTIONS_TABLE: props.tables.userConnectionsTable.tableName,
            ZONE_NAME: props.hostedZone.zoneName,
            WEBSOCKET_API_ID: wsApi.ref,
        };

        const wsConnectHandler = new Function(this, 'WebSocketConnectHandler', {
            functionName: `${props.namePrefix}-WsApiConnectHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/websocket.connect',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        const wsDisconnectHandler = new Function(this, 'WebSocketDisconnectHandler', {
            functionName: `${props.namePrefix}-WsApiDisconnectHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/websocket.disconnect',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        const wsHeartbeatHandler = new Function(this, 'WebSocketHeartbeatHandler', {
            functionName: `${props.namePrefix}-WsApiHeartbeatHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/websocket.heartbeat',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        const wsMessageHandler = new Function(this, 'WebSocketMessageHandler', {
            functionName: `${props.namePrefix}-WsApiMessageHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/websocket.wsMessage',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        const httpHandler = new Function(this, 'HttpHandler', {
            functionName: `${props.namePrefix}-HttpApiHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/http.handle',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        const connectionAuthHandler = new Function(this, 'ConnectionAuthHandler', {
            functionName: `${props.namePrefix}-ConnectionAuthHandler`,
            runtime: Runtime.NODEJS_12_X,
            code: Code.asset(compiledLambdaDir),
            handler: 'handle/connection-auth.handle',
            layers: [handlerDependenciesLayer],
            environment,
            logRetention: RetentionDays.ONE_WEEK,
            memorySize: 256,
        });

        new CfnOutput(this, 'ConnectionAuthHandlerName', {
            value: connectionAuthHandler.functionName,
        });

        const lambdaManageConnectionsPolicy = new PolicyStatement();
        lambdaManageConnectionsPolicy.addActions('execute-api:ManageConnections', 'execute-api:Invoke');
        lambdaManageConnectionsPolicy.addAllResources();

        const handlers = [connectionAuthHandler, httpHandler, wsConnectHandler, wsDisconnectHandler, wsHeartbeatHandler, wsMessageHandler];

        for (const handler of handlers) {
            for (const table of [
                props.tables.adminConnectionsTable,
                props.tables.connectionsTable,
                props.tables.guestsTable,
                props.tables.messagesTable,
                props.tables.roomsTable,
                props.tables.userConnectionsTable,
            ]) {
                table.grantReadWriteData(handler);
            }
            handler.grantInvoke(new ServicePrincipal('apigateway.amazonaws.com'));
            handler.addToRolePolicy(lambdaManageConnectionsPolicy);
        }


        // Websocket API


        const connectIntegration = new CfnIntegration(this, 'WebSocketConnectIntegration', {
            apiId: wsApi.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: `arn:aws:apigateway:${props.env?.region}:lambda:path/2015-03-31/functions/${wsConnectHandler.functionArn}/invocations`,
        });

        const disconnectIntegration = new CfnIntegration(this, 'WebSocketDisconnectIntegration', {
            apiId: wsApi.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: `arn:aws:apigateway:${props.env?.region}:lambda:path/2015-03-31/functions/${wsDisconnectHandler.functionArn}/invocations`,
        });

        const messageIntegration = new CfnIntegration(this, 'WebSocketMessageIntegration', {
            apiId: wsApi.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: `arn:aws:apigateway:${props.env?.region}:lambda:path/2015-03-31/functions/${wsMessageHandler.functionArn}/invocations`,
        });

        const heartbeatIntegration = new CfnIntegration(this, 'WebSocketHeartbeatIntegration', {
            apiId: wsApi.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: `arn:aws:apigateway:${props.env?.region}:lambda:path/2015-03-31/functions/${wsHeartbeatHandler.functionArn}/invocations`,
        });


        const wsConnectRoute = new CfnRoute(this, 'WebSocketConnectRoute', {
            apiId: wsApi.ref,
            routeKey: '$connect',
            authorizationType: 'NONE',
            operationName: 'ConnectRoute',
            target: `integrations/${connectIntegration.ref}`,
        });

        const wsDisconnectRoute = new CfnRoute(this, 'WebSocketDisconnectRoute', {
            apiId: wsApi.ref,
            routeKey: '$disconnect',
            authorizationType: 'NONE',
            operationName: 'DisconnectRoute',
            target: `integrations/${disconnectIntegration.ref}`,
        });

        const wsDefaultRoute = new CfnRoute(this, 'WebSocketDefaultRoute', {
            apiId: wsApi.ref,
            routeKey: '$default',
            authorizationType: 'NONE',
            operationName: 'DefaultRoute',
            target: `integrations/${messageIntegration.ref}`,
        });

        const wsHeartbeatRoute = new CfnRoute(this, 'WebSocketHeartbeatRoute', {
            apiId: wsApi.ref,
            routeKey: 'HEARTBEAT',
            authorizationType: 'NONE',
            operationName: 'HeartbeatRoute',
            target: `integrations/${heartbeatIntegration.ref}`,
        });


        const wsRoutes = [wsConnectRoute, wsDisconnectRoute, wsDefaultRoute, wsHeartbeatRoute];

        const wsDeployment = new CfnDeployment(this, `WebSocketDeployment-${now}`, {
            apiId: wsApi.ref,
            description: 'WebSocketDeployment',
        });

        for (const route of wsRoutes) {
            wsDeployment.addDependsOn(route);
        }

        const wsLogGroup = new LogGroup(this, 'WebSocketLogs', {
            logGroupName: `${props.namePrefix}-WsApiGatewayLogs`,
            retention: RetentionDays.ONE_WEEK,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        wsLogGroup.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));

        const wsStage = new CfnStage(this, 'WebSocketStage', {
            stageName: 'ws',
            apiId: wsApi.ref,
            description: 'WebSocketStage',
            deploymentId: wsDeployment.ref,
            accessLogSettings: {
                destinationArn: wsLogGroup.logGroupArn,
                format: logFormat,
            },
        });

        const wsDomainName = new CfnDomainName(this, 'WebSocketDomainName', {
            domainName: `ws.${props.hostedZone.zoneName}`,
            domainNameConfigurations: [
                {
                    certificateArn: props.certificates.websocket.certificateArn,
                },
            ],
        });

        const wsMapping = new CfnApiMapping(this, 'WebSocketMapping', {
            apiId: wsApi.ref,
            domainName: `ws.${props.hostedZone.zoneName}`,
            stage: wsStage.ref,
        });

        // API DNS record
        const wsCname = new CnameRecord(this, 'WebSocketCnameRecord', {
            zone: props.hostedZone,
            recordName: `ws.${props.hostedZone.zoneName}`,
            // domainName: `${userWsApi.ref}.execute-api.${props.env?.region}.amazonaws.com`,
            domainName: Fn.getAtt(wsDomainName.logicalId, 'RegionalDomainName') as unknown as string,
            ttl: Duration.seconds(60),
        });

        wsMapping.addDependsOn(wsCname.node.defaultChild as cdk.CfnResource);

        this.wsApi = wsApi;

        const httpApi = new CfnApi(this, 'HttpApi', {
            name: `${props.namePrefix}-HttpApi`,
            protocolType: 'HTTP',
            // eslint-disable-next-line no-template-curly-in-string
            routeSelectionExpression: '${request.method} ${request.path}',
            corsConfiguration: {
                allowOrigins: ['*'],
                allowMethods: ['GET', 'OPTIONS', 'POST'],
            },
        });

        const httpIntegration = new CfnIntegration(this, 'HttpIntegration', {
            apiId: httpApi.ref,
            integrationType: 'AWS_PROXY',
            integrationUri: `arn:aws:apigateway:${props.env?.region}:lambda:path/2015-03-31/functions/${httpHandler.functionArn}/invocations`,
            // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
            payloadFormatVersion: '2.0',
        });

        const httpDefaultRoute = new CfnRoute(this, 'HttpDefaultRoute', {
            apiId: httpApi.ref,
            routeKey: '$default',
            authorizationType: 'NONE',
            operationName: 'DefaultRoute',
            target: `integrations/${httpIntegration.ref}`,
        });

        const httpDeployment = new CfnDeployment(this, `HttpDeployment-${now}`, {
            apiId: httpApi.ref,
            description: 'HttpDeployment',
        });

        httpDeployment.addDependsOn(httpDefaultRoute);

        const httpLogGroup = new LogGroup(this, 'HttpLogs', {
            logGroupName: `${props.namePrefix}-HttpApiGatewayLogs`,
            retention: RetentionDays.ONE_WEEK,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        httpLogGroup.grantWrite(new ServicePrincipal('apigateway.amazonaws.com'));

        const httpStage = new CfnStage(this, 'HttpStage', {
            stageName: 'http',
            apiId: httpApi.ref,
            description: 'HttpStage',
            deploymentId: httpDeployment.ref,
            accessLogSettings: {
                destinationArn: httpLogGroup.logGroupArn,
                format: logFormat,
            },
        });
        const httpDomainName = new CfnDomainName(this, 'HttpDomainName', {
            domainName: `api.${props.hostedZone.zoneName}`,
            domainNameConfigurations: [
                {
                    certificateArn: props.certificates.api.certificateArn,
                },
            ],
        });

        const httpMapping = new CfnApiMapping(this, 'HttpMapping', {
            apiId: httpApi.ref,
            domainName: `api.${props.hostedZone.zoneName}`,
            stage: httpStage.ref,
        });

        // Ensure domainName exists first, the may prevent issues with the stage mapping not working correctly
        httpMapping.addDependsOn(httpDomainName);

        // API DNS record
        const httpCname = new CnameRecord(this, 'HttpCnameRecord', {
            zone: props.hostedZone,
            recordName: `api.${props.hostedZone.zoneName}`,
            domainName: Fn.getAtt(httpDomainName.logicalId, 'RegionalDomainName') as unknown as string,
            ttl: Duration.seconds(60),
        });

        httpMapping.addDependsOn(httpCname.node.defaultChild as cdk.CfnResource);

        this.httpApi = httpApi;
    }
}
