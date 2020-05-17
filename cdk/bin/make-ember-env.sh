#!/bin/bash

echo "AWS_REGION=eu-west-2" > ember.env
jq -er '.[] | .CognitoIdentityPoolId |  select (.!=null)' cdk.outputs.json | awk '{print "COGNITO_IDENTITY_POOL_ID="$1}' >> ember.env
jq -er '.[] | .BrochureDistributionId |  select (.!=null)' cdk.outputs.json | awk '{print "BROCHURE_DISTRIBUTION_ID="$1}'>> ember.env     
jq -er '.[] | .FrontendDistributionId |  select (.!=null)' cdk.outputs.json | awk '{print "FRONTEND_DISTRIBUTION_ID="$1}'>> ember.env
jq -er '.[] | .ConnectionAuthHandlerName |  select (.!=null)' cdk.outputs.json | awk '{print "CONNECTION_AUTH_HANDLER_NAME="$1}'>> ember.env

cp ember.env ../frontend/.env
cp ember.env ../brochure/.env
