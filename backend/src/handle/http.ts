import { ClaimRequest, handleClaimRoom, AvailabilityRequest, handleRoomAvailability } from '../room';

type APIGatewayV2PayloadV2HTTPEvent = {
    version: '2.0';
    routeKey: string;
    rawPath: string;
    rawQueryString: string;
    headers: {
        accept: string;
        'content-length': string;
        host: string;
        'user-agent': string;
        'x-amzn-trace-id': string;
        'x-forwarded-for': string;
        'x-forwarded-port': string;
        'x-forwarded-proto': string;
    };
    queryStringParameters: { [key: string]: string };
    requestContext: {
        accountId: string;
        apiId: string;
        domainName: string;
        domainPrefix: string;
        http: {
            method: string;
            path: string;
            protocol: string;
            sourceIp: string;
            userAgent: string;
        };
        requestId: string;
        routeKey: string;
        stage: string;
        time: string;
        timeEpoch: number;
    };
    isBase64Encoded: boolean;
    body?: string;
};


export async function handle(event: APIGatewayV2PayloadV2HTTPEvent, context: unknown): Promise<{}> {
    try {

        console.log('Message');
        console.log(event);
        console.log(context);

        let result: any = 'unknown-action';
        if (event.requestContext.http.method !== 'POST') {
            console.error('POST requests only');
            return { statusCode: 500, body: 'Request not valid' };

        }

        const params = JSON.parse(event.body!);

        if (event.requestContext.http.path.endsWith('/availability')) {
            const availabilityParams = params as AvailabilityRequest;
            if (!availabilityParams) {
                result = 'availability params not specified';
            } else {
                result = await handleRoomAvailability(availabilityParams);
            }
        } else if (event.requestContext.http.path.endsWith('/claim')) {
            const claimParams = params as ClaimRequest;
            if (!claimParams) {
                result = 'claim params not received';
            } else {
                result = await handleClaimRoom(claimParams, event.requestContext.http.sourceIp);
            }
        }

        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: 'Failed to connect' };
    }

}
