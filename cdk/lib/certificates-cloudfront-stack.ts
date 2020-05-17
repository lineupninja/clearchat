/* eslint-disable @typescript-eslint/no-unused-vars */
import { PublicHostedZone } from '@aws-cdk/aws-route53';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { StackProps, Stack, Construct } from '@aws-cdk/core';

export interface CertificatesCloudFrontStackProps extends StackProps {
    hostedZoneName: string;
}

export type CertificatesCloudFront = {
    apex: DnsValidatedCertificate;
    wildcard: DnsValidatedCertificate;
};

export class CertificatesCloudFrontStack extends Stack {

    readonly certificates: CertificatesCloudFront;

    constructor(scope: Construct, id: string, props: CertificatesCloudFrontStackProps) {
        super(scope, id, props);

        const hostedZone = PublicHostedZone.fromLookup(this, 'PublicZoneLookup', {
            domainName: props.hostedZoneName,
        });

        const apexCertificate = new DnsValidatedCertificate(this, 'BaseCertificate', {
            hostedZone,
            domainName: `${hostedZone.zoneName}`,
        });

        const wildcardCertificate = new DnsValidatedCertificate(this, 'WildcardCertificate', {
            hostedZone,
            domainName: `*.${hostedZone.zoneName}`,
        });

        this.certificates = {
            apex: apexCertificate,
            wildcard: wildcardCertificate,
        };

    }
}
