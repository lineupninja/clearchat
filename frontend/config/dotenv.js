/* eslint-env node */

'use strict';

const path = require('path');

module.exports = function (/* env */) {
  return {
    clientAllowedKeys: ['COGNITO_IDENTITY_POOL_ID', 'AWS_REGION', 'CONNECTION_AUTH_HANDLER_NAME'],
    fastbootAllowedKeys: [],
    failOnMissingKey: true,
    path: path.join(path.dirname(__dirname), '.env')
  }
};
