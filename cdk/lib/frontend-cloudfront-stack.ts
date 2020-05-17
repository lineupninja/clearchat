/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { PublicHostedZone, ARecord, AddressRecordTarget } from '@aws-cdk/aws-route53';
import { Bucket } from '@aws-cdk/aws-s3';
import { CloudFrontWebDistribution, ViewerCertificate } from '@aws-cdk/aws-cloudfront';
import { Duration, CfnOutput } from '@aws-cdk/core';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets';
import { Certificates } from '../bin/cdk';

export interface FrontendCloudFrontStackProps extends cdk.StackProps {
    hostedZoneName: string;
    certificates: Certificates;
    namePrefix: string;
    targetRegion: string;
}

export class FrontendCloudFrontStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: FrontendCloudFrontStackProps) {
        super(scope, id, props);

        const bucketName = `${props.namePrefix}-frontend`;

        // Don't use fromBucketName as that will incorrectly assume the bucket is in us-east-1
        // because that is the region for this stack
        const frontendBucket = Bucket.fromBucketAttributes(this, 'FrontendBucket', {
            bucketName,
            bucketRegionalDomainName: `${bucketName}.s3.${props.targetRegion}.amazonaws.com`,
        });

        const frontendDistribution = new CloudFrontWebDistribution(this, 'FrontendDistribution', {
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: frontendBucket,
                    },
                    behaviors: [{ isDefaultBehavior: true }],
                },
            ],
            viewerCertificate: ViewerCertificate.fromAcmCertificate(
                props.certificates.wildcard,
                {
                    aliases: [`*.${props.hostedZoneName}`],
                },
            ),
            errorConfigurations: [
                {
                    errorCode: 404,
                    responseCode: 200,
                    responsePagePath: '/index.html',
                    errorCachingMinTtl: 60,
                },
            ],
        });

        new CfnOutput(this, 'FrontendDistributionId', {
            value: frontendDistribution.distributionId,
        });

        const hostedZone = PublicHostedZone.fromLookup(this, 'PublicZoneLookup', {
            domainName: props.hostedZoneName,
        });

        new ARecord(this, 'FrontendARecord', {
            zone: hostedZone,
            recordName: `*.${props.hostedZoneName}`,
            target: AddressRecordTarget.fromAlias(new CloudFrontTarget(frontendDistribution)),
            ttl: Duration.seconds(60),
        });


    }
}
