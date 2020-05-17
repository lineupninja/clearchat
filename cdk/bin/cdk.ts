#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';
import { ApiStack } from '../lib/api-stack';
import { AccountServicesStack } from '../lib/account-services-stack';
import { CertificatesRegionalStack } from '../lib/certificates-regional-stack';
import { DynamoStack } from '../lib/dynamo-stack';
import { BrochureRegionalStack } from '../lib/brochure-regional-stack';
import { CertificatesCloudFrontStack } from '../lib/certificates-cloudfront-stack';
import { FrontendRegionalStack } from '../lib/frontend-regional-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { BrochureCloudFrontStack } from '../lib/brochure-cloudfront-stack';
import { FrontendCloudFrontStack } from '../lib/frontend-cloudfront-stack';

export type Certificates = {
    apex: DnsValidatedCertificate;
    websocket: DnsValidatedCertificate;
    api: DnsValidatedCertificate;
    wildcard: DnsValidatedCertificate;
};

const account = process.env.AWS_ACCOUNT_ID;

if (!account) {
    throw Error('You must pass AWS_ACCOUNT_ID in the environment');
}

const region = process.env.AWS_REGION;

if (!region) {
    throw Error('You must pass AWS_REGION in the environment');
}

const env = {
    region,
    account,
};

// For CloudFront
const usEast1Env = {
    region: 'us-east-1',
    account,
};

const app = new cdk.App();

const hostedZoneName = process.env.HOSTED_ZONE_NAME;

if (!hostedZoneName) {
    throw Error('HOSTED_ZONE_NAME must be provided in environment');
}
const dashedHostedZoneName = hostedZoneName.replace(/\./g, '-');

const accountServicesStack = new AccountServicesStack(app, `${dashedHostedZoneName}-AccountServicesStack`, {
    env,
    hostedZoneName,
});

const certificatesRegionalStack = new CertificatesRegionalStack(app, `${dashedHostedZoneName}-CertificatesRegionalStack`, {
    env,
    hostedZone: accountServicesStack.hostedZone,
});

const certificatesCloudFrontStack = new CertificatesCloudFrontStack(app, `${dashedHostedZoneName}-CertificatesCloudFrontStack`, {
    env: usEast1Env,
    hostedZoneName,
});


const certificates: Certificates = {
    apex: certificatesCloudFrontStack.certificates.apex,
    api: certificatesRegionalStack.certificates.api,
    websocket: certificatesRegionalStack.certificates.websocket,
    wildcard: certificatesCloudFrontStack.certificates.wildcard,
};

new CognitoStack(app, `${dashedHostedZoneName}-CognitoStack`, {
    env,
    hostedZone: accountServicesStack.hostedZone,
    namePrefix: dashedHostedZoneName,
});

const dynamoStack = new DynamoStack(app, `${dashedHostedZoneName}-DynamoStack`, {
    env,
    namePrefix: dashedHostedZoneName,
});

new ApiStack(app, `${dashedHostedZoneName}-ApiStack`, {
    env,
    hostedZone: accountServicesStack.hostedZone,
    certificates,
    namePrefix: dashedHostedZoneName,
    tables: dynamoStack.tables,
});

new BrochureRegionalStack(app, `${dashedHostedZoneName}-BrochureRegionalStack`, {
    env,
    namePrefix: dashedHostedZoneName,
});

new BrochureCloudFrontStack(app, `${dashedHostedZoneName}-BrochureCloudFrontStack`, {
    env: usEast1Env,
    hostedZoneName,
    certificates,
    namePrefix: dashedHostedZoneName,
    targetRegion: region,
});

new FrontendRegionalStack(app, `${dashedHostedZoneName}-FrontendRegionalStack`, {
    env,
    namePrefix: dashedHostedZoneName,
});

new FrontendCloudFrontStack(app, `${dashedHostedZoneName}-FrontendCloudFrontStack`, {
    env: usEast1Env,
    hostedZoneName,
    certificates,
    namePrefix: dashedHostedZoneName,
    targetRegion: region,
});
