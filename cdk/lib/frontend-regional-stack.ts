/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { RemovalPolicy } from '@aws-cdk/core';

export interface FrontendRegionalStackProps extends cdk.StackProps {
    namePrefix: string;
}

export class FrontendRegionalStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: FrontendRegionalStackProps) {
        super(scope, id, props);

        new Bucket(this, 'FrontendBucket', {
            bucketName: `${props.namePrefix}-frontend`,
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

    }
}
