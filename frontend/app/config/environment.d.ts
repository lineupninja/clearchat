export default config;

/**
 * Type declarations for
 *    import config from './config/environment'
 *
 * For now these need to be managed by the developer
 * since different ember addons can materialize new entries.
 */
declare const config: {
    environment: any;
    modulePrefix: string;
    podModulePrefix: string;
    locationType: string;
    rootURL: string;
    httpApi: string;
    wsApi: string;
    brochureUrl: string;
    COGNITO_IDENTITY_POOL_ID: string;
    AWS_REGION: string;
    CONNECTION_AUTH_HANDLER_NAME: string;
};
