/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { APIGatewayEvent } from 'aws-lambda';
import { DynamoDB, ApiGatewayManagementApi } from 'aws-sdk';
import { Message, getMessages, storeMessage, MessageToSend, getRoomMessages } from '../message';
import { getUserFromConnectionId, getConnectionIdsForRoomUser, getConnectionIdsForRoomAdmins } from '../user';
import { createGuest, getRoomGuests, Guest, GuestState, getGuestByUser, setGuestState } from '../guest';
import { getRoom, Room, RoomGrant, updateRoomAccessedTime, updateRoomGrant, deleteRoom, resetRoom } from '../room';


type GetMessagesRequest = {
    request: 'GET_MESSAGES';
};

type GetMessagesResponse = {
    response: 'GET_MESSAGES';
    messages: Message[];
};

type SendMessagesRequest = {
    request: 'SEND_MESSAGE';
    message: MessageToSend;
};

type GetRoomMessagesRequest = {
    request: 'GET_ROOM_MESSAGES';
};

type GetGuestRequest = {
    request: 'GET_GUEST';
};

type GetGuestResponse = {
    response: 'GET_GUEST';
    guest: Guest | null;
};

type GetRoomDetailsRequest = {
    request: 'GET_ROOM_DETAILS';
};

type GetRoomDetailsResponse = {
    response: 'GET_ROOM_DETAILS';
    room: Room;
};

type GetRoomGuestsRequest = {
    request: 'GET_ROOM_GUESTS';
};

type GetRoomGuestsResponse = {
    response: 'GET_ROOM_GUESTS';
    guests: Guest[];
};

type SetRoomGrantRequest = {
    request: 'SET_ROOM_GRANT';
    grant: RoomGrant;
};

type CreateGuestRequest = {
    request: 'CREATE_GUEST';
    name: string;
};

type SetGuestStateRequest = {
    request: 'SET_GUEST_STATE';
    state: GuestState;
    userId: string;
};

type DeleteRoomRequest = {
    request: 'DELETE_ROOM';
};

type ResetRoomRequest = {
    request: 'RESET_ROOM';
};

type HeartbeatRequest = {
    request: 'HEARTBEAT';
};

type HeartbeatResponse = {
    response: 'HEARTBEAT';
    connectionId: string;
};

type ConnectionAuthenticatedResponse = {
    response: 'CONNECTION_AUTHENTICATED';
};

/**
 * Sent from the backend when the client should reload the page
 * This occurs when the room has been reset or deleted and forces a refresh of connected clients
 */
type ReloadPageResponse = {
    response: 'RELOAD_PAGE';
};

/**
 * Redirect the user to the brochure site.
 * Sent when the room is deleted
 */
type RedirectToBrochureResponse = {
    response: 'REDIRECT_TO_BROCHURE';
};


type ErrorResponse = {
    response: 'ERROR';
    code: 'USER_NOT_ADMIN' | 'ROOM_NOT_FOUND';
};


type Response = GetMessagesResponse | GetGuestResponse | GetRoomDetailsResponse | GetRoomGuestsResponse | HeartbeatResponse | ConnectionAuthenticatedResponse | ReloadPageResponse | RedirectToBrochureResponse | ErrorResponse;

// The endpoint for API Gateway is computed from the API_ID because
// event.requestContext.domainName contains the CNAME URL thus can't be
// used to access the connections endpoint
const apiGwEndpoint = `${process.env.WEBSOCKET_API_ID}.execute-api.${process.env.AWS_REGION}.amazonaws.com/ws`;
console.log(`API Gateway Endpoint is ${apiGwEndpoint}`);


export async function connect(event: APIGatewayEvent, context: unknown): Promise<{}> {
    try {

        console.log('Connect');
        console.log(event);
        console.log(context);

        const { connectionId } = event.requestContext;

        const connectionsTable = process.env.CONNECTIONS_TABLE;

        if (!connectionsTable) {
            throw Error('CONNECTIONS_TABLE must be defined in environment');
        }

        const userConnectionsTable = process.env.USER_CONNECTIONS_TABLE;

        if (!userConnectionsTable) {
            throw Error('USER_CONNECTIONS_TABLE must be defined in environment');
        }

        const adminConnectionsTable = process.env.ADMIN_CONNECTIONS_TABLE;

        if (!adminConnectionsTable) {
            throw Error('ADMIN_CONNECTIONS_TABLE must be defined in environment');
        }


        if (!event.queryStringParameters) {
            throw Error('Event must have queryStringParameters');

        }

        const { roomId, userId, adminToken } = event.queryStringParameters;

        if (!roomId) {
            throw Error('Room must be passed as query string parameter');
        }

        if (!userId) {
            throw Error('User id must be passed as query string parameter');
        }

        const userIdParts = userId.split(':');
        if (userIdParts.length !== 2) {
            throw Error('User is wrong format');
        }

        if (userIdParts[0] !== process.env.AWS_REGION) {
            throw Error('User id wrong region');
        }

        // Test the userId is valid format
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userIdParts[1])) {
            throw Error('User id not UUID');
        }

        // Get the room
        const room = await getRoom(roomId);

        if (!room) {
            // Room does not exist
            // Prevent user connection
            console.warn(`Room ${roomId} does not exist`);
            return { statusCode: 500, body: 'Room does not exist' };
        }

        const isAdmin = room.adminToken === adminToken;

        const createdTime = new Date().getTime();

        const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

        const putConnectionParams: DynamoDB.DocumentClient.PutItemInput = {
            TableName: connectionsTable,
            Item: {
                connectionId,
                roomId,
                userId,
                isAdmin,
                authenticated: false,
                createdTime,
            },
        };

        const putUserConnectionParams: DynamoDB.DocumentClient.PutItemInput = {
            TableName: userConnectionsTable,
            Item: {
                userId,
                roomId_connectionId: `${roomId}::${connectionId}`,
                isAdmin,
                createdTime,
            },
        };

        const putAdminConnectionParams: DynamoDB.DocumentClient.PutItemInput = {
            TableName: adminConnectionsTable,
            Item: {
                roomId,
                connectionId,
                userId,
                createdTime,
            },
        };

        const putConnectionTransactionParams: DynamoDB.DocumentClient.TransactWriteItemsInput = {
            TransactItems: [
                { Put: putConnectionParams },
                { Put: putUserConnectionParams },
            ],
        };

        if (isAdmin) {
            putConnectionTransactionParams.TransactItems.push(
                { Put: putAdminConnectionParams },
            );
        }

        await documentClient.transactWrite(putConnectionTransactionParams).promise();

        return { statusCode: 200, body: 'Connected.' };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: 'Failed to connect' };
    }

}


export async function disconnect(event: APIGatewayEvent, context: unknown): Promise<{}> {
    try {

        console.log('Disconnect');
        console.log(event);
        console.log(context);


        const connectionsTable = process.env.CONNECTIONS_TABLE;

        if (!connectionsTable) {
            throw Error('Connections table must be defined in environment');
        }
        const userConnectionsTable = process.env.USER_CONNECTIONS_TABLE;

        if (!userConnectionsTable) {
            throw Error('USER_CONNECTIONS_TABLE must be defined in environment');

        }

        const user = await getUserFromConnectionId(event.requestContext.connectionId!);

        // Note that queryStringParameters are not available on $disconnect

        console.log(`Deleting ${event.requestContext.connectionId}`);
        const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
        const deleteConnectionsParams: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: connectionsTable,
            Key: {
                connectionId: `${event.requestContext.connectionId}`,
            },
        };
        if (user) {
            const deleteUserConnectionsParams: DynamoDB.DocumentClient.DeleteItemInput = {
                TableName: userConnectionsTable,
                Key: {
                    userId: user.userId,
                    roomId_connectionId: `${user.roomId}::${event.requestContext.connectionId}`,
                },
            };
            console.log('Deleting user from USER_CONNECTIONS');
            await documentClient.delete(deleteUserConnectionsParams).promise();

        }

        await documentClient.delete(deleteConnectionsParams).promise();
        console.log('Deleted');

        return { statusCode: 200, body: 'Disconnected.' };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: `Failed to disconnect: ${JSON.stringify(err)}` };
    }

}


export async function heartbeat(event: APIGatewayEvent): Promise<{}> {

    try {
        console.log(event);
        const response: HeartbeatResponse = {
            response: 'HEARTBEAT',
            connectionId: event.requestContext.connectionId!,
        };
        await sendResponseToCurrentConnection(event, response);
        return { statusCode: 200, body: 'ok' };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: 'Failed to handle heartbeat' };
    }
}


export async function wsMessage(event: APIGatewayEvent, context: unknown): Promise<{}> {

    try {
        console.log('Message');
        console.log(event);
        console.log(context);

        const { body } = event;

        if (!body) {
            throw Error('Event is missing body');

        }

        const request = JSON.parse(body) as GetMessagesRequest | SendMessagesRequest | GetGuestRequest | GetRoomDetailsRequest | GetRoomGuestsRequest | GetRoomMessagesRequest | SetRoomGrantRequest | CreateGuestRequest | SetGuestStateRequest | DeleteRoomRequest | ResetRoomRequest | HeartbeatRequest;

        if (!request.request) {
            throw Error('Body is missing request');
        }
        console.log(request.request);

        const user = await getUserFromConnectionId(event.requestContext.connectionId!);


        if (!user) {
            throw Error(`Could not get user from connection id ${event.requestContext.connectionId}`);
        }

        if (!user.authenticated) {
            return { statusCode: 500, body: 'not authenticated' };
        }

        switch (request.request) {
            case 'GET_MESSAGES':
                {
                    console.log('GET MESSAGES');
                    const messages = await getMessages(user);
                    const response: GetMessagesResponse = {
                        response: 'GET_MESSAGES',
                        messages,
                    };
                    await sendResponseToCurrentConnection(event, response);
                }
                break;
            case 'SEND_MESSAGE':
                {
                    const { message, guest } = await storeMessage(user, request.message);
                    const response: GetMessagesResponse = {
                        response: 'GET_MESSAGES',
                        messages: [message],
                    };
                    // Send to the userId the message was sent to
                    // Which may be different to the connected user
                    await sendResponse(user.roomId, message.userId, response, true);
                    // Send the updated guest record to the user and the room admin
                    const getGuestsResponse: GetGuestResponse = {
                        response: 'GET_GUEST',
                        guest,
                    };
                    await sendResponse(user.roomId, message.userId, getGuestsResponse, true);
                }
                break;
            case 'GET_GUEST':
                if (user.isAdmin) {
                    // Admin user should call GET_ROOM_GUESTS
                    console.warn('Ignoring GET_GUEST from admin user');
                } else {
                    const guest = await getGuestByUser(user);
                    const response: GetGuestResponse = {
                        response: 'GET_GUEST',
                        guest,
                    };
                    await sendResponseToCurrentConnection(event, response);
                }
                break;
            case 'GET_ROOM_DETAILS':
                if (user.isAdmin) {
                    const room = await getRoom(user.roomId);
                    if (room) {
                        await updateRoomAccessedTime(room);
                        const response: GetRoomDetailsResponse = {
                            response: 'GET_ROOM_DETAILS',
                            room,
                        };
                        await sendResponseToCurrentConnection(event, response);
                    } else {
                        console.warn(`Room ${user.roomId} not found`);
                        await sendResponseToCurrentConnection(event, {
                            response: 'ERROR',
                            code: 'ROOM_NOT_FOUND',
                        });
                    }
                } else {
                    console.warn('Got GET_ROOM_DETAILS from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });
                }
                break;

            case 'GET_ROOM_GUESTS':
                if (user.isAdmin) {
                    const guests = await getRoomGuests(user.roomId);
                    const response: GetRoomGuestsResponse = {
                        response: 'GET_ROOM_GUESTS',
                        guests,
                    };
                    await sendResponseToCurrentConnection(event, response);
                } else {
                    console.warn('Got GET_ROOM_GUESTS from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });

                }
                break;
            case 'GET_ROOM_MESSAGES':
                if (user.isAdmin) {
                    const messages = await getRoomMessages(user.roomId);
                    const response: GetMessagesResponse = {
                        response: 'GET_MESSAGES',
                        messages,
                    };
                    await sendResponseToCurrentConnection(event, response);
                } else {
                    console.warn('Got GET_ROOM_MESSAGES from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });

                }
                break;

            case 'SET_ROOM_GRANT':
                if (user.isAdmin) {
                    const approvedGuests = await updateRoomGrant(user.roomId, request.grant);
                    // Send out the update guest records
                    await Promise.all(approvedGuests.map((guest) => sendResponse(user.roomId, guest.userId, {
                        response: 'GET_GUEST',
                        guest,
                    }, false)));
                } else {
                    console.warn('Got SET_ROOM_GRANT from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });

                }

                break;
            case 'DELETE_ROOM':
                if (user.isAdmin) {
                    // Get all guests. They will be redirected to the brochure site when the room is deleted
                    const guests = await getRoomGuests(user.roomId);
                    await deleteRoom(user.roomId);
                    // Notify the admins the room has been deleted
                    await sendResponseToConnectionIds({
                        response: 'REDIRECT_TO_BROCHURE',
                    }, (await getConnectionIdsForRoomAdmins(user.roomId)));
                    // Send out the update guest records
                    await Promise.all(guests.map((guest) => sendResponse(user.roomId, guest.userId, {
                        response: 'REDIRECT_TO_BROCHURE',
                    }, false)));
                } else {
                    console.warn('Got DELETE_ROOM from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });
                }
                break;
            case 'RESET_ROOM':
                if (user.isAdmin) {
                    // Get all guests. They will be redirected to the brochure site when the room is deleted
                    const guests = await getRoomGuests(user.roomId);
                    await resetRoom(user.roomId);
                    // Notify the admins the room has been cleared
                    await sendResponseToConnectionIds({
                        response: 'RELOAD_PAGE',
                    }, (await getConnectionIdsForRoomAdmins(user.roomId)));

                    // Send out the update guest records
                    await Promise.all(guests.map((guest) => sendResponse(user.roomId, guest.userId, {
                        response: 'RELOAD_PAGE',
                    }, false)));
                } else {
                    console.warn('Got RESET_ROOM from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });
                }
                break;

            case 'CREATE_GUEST':
                {
                    const createdGuest = await createGuest(user, request.name);
                    const response: GetGuestResponse = {
                        response: 'GET_GUEST',
                        guest: createdGuest,
                    };
                    await sendResponse(user.roomId, user.userId, response, true);
                }
                break;
            case 'SET_GUEST_STATE':
                if (user.isAdmin) {
                    const setGuestStateRequest = request as SetGuestStateRequest;
                    const guest = await setGuestState(user.roomId, setGuestStateRequest.userId, setGuestStateRequest.state);
                    const response: GetGuestResponse = {
                        response: 'GET_GUEST',
                        guest,
                    };
                    await sendResponse(user.roomId, setGuestStateRequest.userId, response, true);
                } else {
                    console.warn('Got SET_GUEST_STATE from non admin user');
                    await sendResponseToCurrentConnection(event, {
                        response: 'ERROR',
                        code: 'USER_NOT_ADMIN',
                    });
                }
                break;
            default:
                // @ts-ignore
                throw Error(`Unexpected request ${request.request}`);

        }
        return { statusCode: 200, body: 'ok' };

    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: 'Failed to handle default route' };
    }
}

/**
 * Send a response to all connections for a specific user, optionally copy this response to admins
 */

async function sendResponse(roomId: string, userId: string, response: Response, copyToAdmins: boolean): Promise<void> {

    const connectionIds = await getConnectionIdsForRoomUser(roomId, userId);

    if (copyToAdmins) {
        const adminConnectionIds = await getConnectionIdsForRoomAdmins(roomId);
        connectionIds.push(...adminConnectionIds);
    }
    await sendResponseToConnectionIds(response, connectionIds);

}

/**
 * Sends the response to the current connected connection ID ONLY
 * Does not copy the response to other connections for the same user
 */
async function sendResponseToCurrentConnection(event: APIGatewayEvent, response: Response): Promise<void> {
    const apiGwManagementApi = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: apiGwEndpoint,
    });

    const connectionId = event.requestContext.connectionId!;

    console.log(`Sending response ${JSON.stringify(response)} to connectionId ${connectionId}`);
    try {
        await apiGwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(response) }).promise();
    } catch (e) {
        console.warn(`Couldn't notify ${connectionId} it has probably gone away`);
    }
}

/**
 * Send a response to specific connection ids
 */

export async function sendResponseToConnectionIds(response: Response, connectionIds: string[]): Promise<void> {
    const apiGwManagementApi = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: apiGwEndpoint,
    });
    console.log(`Sending response ${JSON.stringify(response)} to connectionIds ${JSON.stringify(connectionIds)}`);

    for (const connectionId of connectionIds) {
        try {
            console.log(`Connection id: ${connectionId}`);
            await apiGwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(response) }).promise();
        } catch (e) {
            console.warn(`Couldn't notify ${connectionId} it has probably gone away`);
        }
    }

}
