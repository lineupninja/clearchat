import { Context } from 'aws-lambda';
import { getConnectionIdsForRoomUser, markConnectionIdsAuthenticated } from '../user';
import { sendResponseToConnectionIds } from './websocket';

/**
 * Marks the cognito users connections as authenticated and notifies the connections that they have been authenticated
 */
export async function handle(event: { roomId: string }, context: Context): Promise<{}> {
    try {

        console.log('Message');
        console.log(event);
        console.log(context);
        const { identity } = context;
        if (!identity) {
            return { statusCode: 500, body: 'No identity' };
        }

        const userId = identity.cognitoIdentityId;

        // TODO: Verify poolID

        const connectionIds = await getConnectionIdsForRoomUser(event.roomId, userId);
        console.log(`Marking ${connectionIds.join(',')} connection Ids as authenticated`);
        await markConnectionIdsAuthenticated(connectionIds);

        await sendResponseToConnectionIds({
            response: 'CONNECTION_AUTHENTICATED',
        }, connectionIds);

        const result = { ok: 'ok' };

        return { statusCode: 200, body: JSON.stringify(result) };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: 'Error' };
    }

}
