/* eslint-env node */
'use strict';

module.exports = function (deployTarget) {
  let ENV = {
    build: {}
    // include other plugin configuration that applies to all deploy targets here
  };

  if (deployTarget === 'development') {
    ENV.build.environment = 'development';
    // configure other plugins for development deploy target here
  }

  if (deployTarget === 'staging') {
    ENV.build.environment = 'production';
    // configure other plugins for staging deploy target here
  }

  if (deployTarget === 'production') {
    ENV.build.environment = 'production';
    // configure other plugins for production deploy target here
  }

  ENV.s3 = {
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
    filePattern: '**/*.{js,css,png,gif,ico,jpg,xml,txt,svg,swf,eot,ttf,woff,woff2,otf}'
  };
  ENV['s3-index'] = {
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
    allowOverwrite: true, // Allowed so an 'all' deployment will succeeded if there are no changes to this project        
  };
  ENV.cloudfront = {
    distribution: process.env.FRONTEND_DISTRIBUTION_ID,
  };

  // Note: if you need to build some configuration asynchronously, you can return
  // a promise that resolves with the ENV object instead of returning the
  // ENV object synchronously.
  return ENV;
};
