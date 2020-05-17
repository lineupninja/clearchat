/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { Bucket } from '@aws-cdk/aws-s3';
import { RemovalPolicy } from '@aws-cdk/core';

export interface BrochureRegionalStackProps extends cdk.StackProps {
    namePrefix: string;
}

export class BrochureRegionalStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: BrochureRegionalStackProps) {
        super(scope, id, props);

        new Bucket(this, 'BrochureBucket', {
            bucketName: `${props.namePrefix}-brochure`,
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

    }
}
