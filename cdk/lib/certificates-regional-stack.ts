/* eslint-disable @typescript-eslint/no-unused-vars */
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { StackProps, Stack, Construct } from '@aws-cdk/core';

export interface CertificatesRegionalStackProps extends StackProps {
    hostedZone: PublicHostedZone;
}

export type CertificatesRegional = {
    websocket: DnsValidatedCertificate;
    api: DnsValidatedCertificate;
};

export class CertificatesRegionalStack extends Stack {

    readonly certificates: CertificatesRegional;

    constructor(scope: Construct, id: string, props: CertificatesRegionalStackProps) {
        super(scope, id, props);

        const websocketCertificate = new DnsValidatedCertificate(this, 'WsApiCertificate', {
            hostedZone: props.hostedZone,
            domainName: `ws.${props.hostedZone.zoneName}`,
        });

        const apiCertificate = new DnsValidatedCertificate(this, 'HttpApiCertificate', {
            hostedZone: props.hostedZone,
            domainName: `api.${props.hostedZone.zoneName}`,
        });

        this.certificates = {
            api: apiCertificate,
            websocket: websocketCertificate,
        };

    }
}
