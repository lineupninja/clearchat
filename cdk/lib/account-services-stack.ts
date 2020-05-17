/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { PublicHostedZone } from '@aws-cdk/aws-route53';

export interface AccountServicesStackProps extends cdk.StackProps {
    hostedZoneName: string;
}

export class AccountServicesStack extends cdk.Stack {

    readonly hostedZone: PublicHostedZone;

    constructor(scope: cdk.Construct, id: string, props: AccountServicesStackProps) {
        super(scope, id, props);

        const hostedZone = new PublicHostedZone(this, 'PublicZone', {
            zoneName: props.hostedZoneName,
        });

        this.hostedZone = hostedZone;

    }
}
