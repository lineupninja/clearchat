'use strict';

module.exports = function (environment) {
    const ENV = {
        modulePrefix: 'clearchat-frontend',
        environment,
        rootURL: '/',
        locationType: 'auto',
        httpApi: process.env.HOSTED_ZONE_NAME ? `https://api.${process.env.HOSTED_ZONE_NAME}` : 'https://api.test.clearchat.cc',
        wsApi: process.env.HOSTED_ZONE_NAME ? `wss://ws.${process.env.HOSTED_ZONE_NAME}` : 'wss://ws.test.clearchat.cc',
        brochureUrl: process.env.HOSTED_ZONE_NAME ? `https://${process.env.HOSTED_ZONE_NAME}` : 'https://test.clearchat.cc',
        showdown: {
            simplifiedAutoLink: true,
            simpleLineBreaks: true,
            openLinksInNewWindow: true,
        },
        EmberENV: {
            FEATURES: {
                // Here you can enable experimental features on an ember canary build
                // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
            },
            EXTEND_PROTOTYPES: {
                // Prevent Ember Data from overriding Date.parse.
                Date: false,
            },
        },

        APP: {
            // Here you can pass flags/options to your application instance
            // when it is created
        },
    };

    if (environment === 'development') {
        // ENV.APP.LOG_RESOLVER = true;
        // ENV.APP.LOG_ACTIVE_GENERATION = true;
        // ENV.APP.LOG_TRANSITIONS = true;
        // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
        // ENV.APP.LOG_VIEW_LOOKUPS = true;
    }

    if (environment === 'test') {
        // Testem prefers this...
        ENV.locationType = 'none';

        // keep test console output quieter
        ENV.APP.LOG_ACTIVE_GENERATION = false;
        ENV.APP.LOG_VIEW_LOOKUPS = false;

        ENV.APP.rootElement = '#ember-testing';
        ENV.APP.autoboot = false;
    }

    if (environment === 'production') {
        // here you can enable a production-specific feature
    }

    return ENV;
};
