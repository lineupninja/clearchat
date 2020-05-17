/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { set } from '@ember/object';
import ENV from 'clearchat-frontend/config/environment';
// @ts-ignore - No types available
import { AwsClient } from 'aws4fetch';
import { enqueueTask, task } from 'ember-concurrency-decorators';
import Auth from '@aws-amplify/auth';
import Amplify, { ICredentials } from '@aws-amplify/core';
import Websockets, { EmberWebsocket } from 'ember-websockets/services/sockets';

export type Message = {

    messageId: string;
    roomId: string;
    userId: string;
    content: string;
    createdTime: number;
    direction: 'IN' | 'OUT';

};

export type GuestState = 'PENDING' | 'GRANTED' | 'DENIED';


export type Guest = {
    roomId: string;
    userId: string;
    name: string;
    state: GuestState;
    createdTime: number;
    requestedAccessTime: number;
    messageSentByUserTime?: number;
    messageReadByAdminTime?: number;
    grant?: RoomGrant;
};


export type Room = {
    roomId: string;
    creator: string;
    createdTime: number;
    email?: string;
    grant: RoomGrant;
    adminToken: string;
};


export type GrantMode = 'LINK' | 'TEXT';
export type AdminMode = 'LINK' | 'EMAIL';

export type RoomGrant = {
    mode: GrantMode;
    text: string;
};

export type AdminMessage = {
    userId: string;
    content: string;
    direction: 'OUT';
};

export type UserMessage = {
    content: string;
    direction: 'IN';
};

export type MessageToSend = AdminMessage | UserMessage;

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

type ConnectionAuthenticatedResponse = {
    response: 'CONNECTION_AUTHENTICATED';
};

type ErrorResponse = {
    response: 'ERROR';
    code: 'USER_NOT_ADMIN' | 'ROOM_NOT_FOUND';
};


type ResponseMessage = GetMessagesResponse | GetGuestResponse | GetRoomDetailsResponse | GetRoomGuestsResponse | ConnectionAuthenticatedResponse | HeartbeatResponse | ReloadPageResponse | RedirectToBrochureResponse | ErrorResponse;

type RequestMessage = GetMessagesRequest | SendMessagesRequest | GetGuestRequest | GetRoomDetailsRequest | GetRoomGuestsRequest | GetRoomMessagesRequest | SetRoomGrantRequest | CreateGuestRequest | SetGuestStateRequest | DeleteRoomRequest | ResetRoomRequest | HeartbeatRequest;

export default class Backend extends Service {
    // normal class body definition here

    @service websockets!: Websockets;

    env = ENV;

    @tracked
    connectionState: 'AWAITING_AUTH_VERIFICATION' | 'CONNECTED' | 'DISCONNECTED' | 'MISSING_HEARTBEAT' = 'DISCONNECTED';

    /**
     * For internal tracking of the connection state
     * Consumers should use connectionState
     */
    @tracked
    private connected = false;

    @tracked
    roomId = 'not-connected';

    @tracked
    userId = 'not-connected';

    @tracked
    isAdmin = false;

    @tracked
    hasInvalidAdminToken = false;

    get adminClass(): string {
        return this.isAdmin ? 'admin' : 'user';
    }

    @tracked
    guest: Guest | null | undefined;

    @tracked
    roomGuests: Guest[] = [];

    /**
     * The room, for connected admin users only
     */
    @tracked
    room: Room | null = null;

    @tracked
    roomMessages: { [userId: string]: Message[] } = {};

    @tracked
    messages: Message[] = [];

    /**
     * Once authenticated the users AWS credentials
     */
    currentCredentials: ICredentials | undefined;

    private socket: EmberWebsocket | undefined;

    private socketUrl: string | undefined;

    private socketShouldReconnect = false;

    @tracked
    connectionError: string | null = null;


    private heartbeatConnectionId: string | undefined;

    private heartbeatReceivedAtTime: number | undefined;

    private heartbeatSentAtTime: number | undefined;

    /**
     * A task to manage the websocket connection
     * Ensures we are either connecting or disconnecting and end up in the desired state
     */
    @enqueueTask
    manageConnection = task(function* (this: Backend, connect: boolean, adminToken: string | null) {
        if (connect) {
            this.socketShouldReconnect = true;
            yield this.connectToRoom(adminToken);
        } else {
            this.socketShouldReconnect = false;
            this.disconnectFromRoom();
        }
    });

    async connectToRoom(adminToken: string | null): Promise<void> {
        try {
            Amplify.configure({
                Auth: {

                    // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID

                    identityPoolId: ENV.COGNITO_IDENTITY_POOL_ID,

                    region: ENV.AWS_REGION,

                    // OPTIONAL - Enforce user authentication prior to accessing AWS resources or not
                    mandatorySignIn: false,

                },
            });

            const currentCredentials: ICredentials = await Auth.currentCredentials();

            this.currentCredentials = currentCredentials;

            let roomId: string;
            if (window.location.hostname.includes('localhost')) {
                roomId = 'local';
            } else {
                [roomId] = window.location.hostname.split('.');
            }


            if (currentCredentials.identityId) {
                this.roomId = roomId;

                const userId = currentCredentials.identityId;
                this.userId = userId;
                console.log(`Connecting to ${roomId} as ${this.userId}`);

                this.isAdmin = adminToken !== null;
                this.socketUrl = `${ENV.wsApi}/?roomId=${roomId}&userId=${userId}&adminToken=${adminToken}`;
                this.socket = this.websockets.socketFor(this.socketUrl);
                this.socket.on('open', this.openHandler, this);
                this.socket.on('message', this.messageHandler, this);
                this.socket.on('close', this.closeHandler, this);
            } else {
                throw Error('identityId was undefined');
            }
        } catch (e) {
            this.connectionError = 'Could not connect, please refresh to try again';
            throw (e);
        }
    }

    disconnectFromRoom(): void {
        if (this.socketUrl) {
            this.websockets.closeSocketFor(this.socketUrl);
        }
    }

    openHandler(event: MessageEvent): void {
        // this.connectionState = 'CONNECTED';
        this.connectionState = 'AWAITING_AUTH_VERIFICATION';
        this.connected = true;
        console.log('open event');
        console.dir(event);
        this.verifyAuthentication.perform();
    }

    messageHandler(event: MessageEvent): void {
        console.log('message event');
        console.dir(event);
        try {
            const data = JSON.parse(event.data) as ResponseMessage;
            console.log(`Response: ${data.response}`);
            switch (data.response) {
                case 'GET_MESSAGES':
                    this.getMessagesResponse(data);
                    break;
                case 'GET_GUEST':
                    this.getGuestResponse(data);
                    break;
                case 'GET_ROOM_DETAILS':
                    this.getRoomDetailsResponse(data);
                    break;
                case 'GET_ROOM_GUESTS':
                    this.getRoomGuestsResponse(data);
                    break;
                case 'HEARTBEAT':
                    this.heartbeatResponse(data);
                    break;
                case 'CONNECTION_AUTHENTICATED':
                    if (this.connectionState === 'AWAITING_AUTH_VERIFICATION') {
                        console.log('Connection authenticated');
                        this.connectionState = 'CONNECTED';
                    } else {
                        console.error(`Received CONNECTION_AUTHENTICATED but connection is ${this.connectionState} not AWAITING_AUTH_VERIFICATION`);
                    }
                    break;
                case 'RELOAD_PAGE':
                    window.location.reload();
                    break;
                case 'REDIRECT_TO_BROCHURE':
                    window.location.href = ENV.brochureUrl;
                    break;
                case 'ERROR':
                default: {
                    const errorResponse = data as ErrorResponse;
                    console.error('Got error response or response not recognized');
                    if (errorResponse.code === 'USER_NOT_ADMIN') {
                        this.hasInvalidAdminToken = true;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            console.log('Got invalid event');
        }
    }

    closeHandler(event: MessageEvent): void {
        this.connectionState = 'DISCONNECTED';
        this.connected = false;
        console.log('close event');
        console.dir(event);
        if (this.socketShouldReconnect) {
            this.socket!.reconnect();
        }
    }


    sendWsMessage(wsMessage: RequestMessage): void {
        if (this.connected) {
            console.dir(wsMessage);
            this.socket!.send(wsMessage, true);
        }
    }

    sendMessage(content: string): void {
        const messageToSend: MessageToSend = {
            content,
            direction: 'IN',
        };
        const wsMessage: SendMessagesRequest = {
            request: 'SEND_MESSAGE',
            message: messageToSend,
        };
        this.sendWsMessage(wsMessage);
    }

    sendAdminMessage(userId: string, content: string): void {
        const messageToSend: MessageToSend = {
            userId,
            content,
            direction: 'OUT',
        };
        const wsMessage: SendMessagesRequest = {
            request: 'SEND_MESSAGE',
            message: messageToSend,
        };
        this.sendWsMessage(wsMessage);
    }


    getMessages(): void {
        const wsMessage: GetMessagesRequest = {
            request: 'GET_MESSAGES',
        };
        this.sendWsMessage(wsMessage);
    }

    getMessagesResponse(response: GetMessagesResponse): void {
        if (this.isAdmin) {
            for (const message of response.messages) {
                if (!this.roomMessages[message.userId]) {
                    this.roomMessages[message.userId] = [];
                }
                const existingMessage = this.roomMessages[message.userId].find((m) => m.messageId === message.messageId);
                if (!existingMessage) {
                    this.roomMessages[message.userId].pushObject(message);
                }
            }
            // Force tracked property to update
            // eslint-disable-next-line no-self-assign
            this.roomMessages = this.roomMessages;
        } else {
            const existingMessageIds = this.messages.map((m) => m.messageId);
            const messagesToAdd = response.messages.filter((m) => !existingMessageIds.includes(m.messageId));
            this.messages.pushObjects(messagesToAdd);
        }
    }

    getRoomMessages(): void {
        const wsMessage: GetRoomMessagesRequest = {
            request: 'GET_ROOM_MESSAGES',
        };
        this.sendWsMessage(wsMessage);
    }

    getGuest(): void {
        const wsMessage: GetGuestRequest = {
            request: 'GET_GUEST',
        };
        this.sendWsMessage(wsMessage);
    }

    getGuestResponse(response: GetGuestResponse): void {
        const { guest } = response;
        if (this.isAdmin && guest) {
            const existingGuest = this.roomGuests.find((g) => g.userId === guest.userId);
            if (existingGuest) {
                // Update the existing guest
                // Maybe figure out a way to use @tracked here?
                set(existingGuest, 'roomId', guest.roomId);
                set(existingGuest, 'userId', guest.userId);
                set(existingGuest, 'name', guest.name);
                set(existingGuest, 'state', guest.state);
                set(existingGuest, 'messageSentByUserTime', guest.messageSentByUserTime);
                set(existingGuest, 'messageReadByAdminTime', guest.messageReadByAdminTime);
                set(existingGuest, 'grant', guest.grant);
            } else if (response.guest) {
                this.roomGuests.pushObject(guest);
            }
            if (guest.state === 'PENDING') {
                new Audio('sounds/new-guest.mp3').play();
            }
        } else if (!this.isAdmin && (!guest || guest.userId === this.userId)) {
            // Received my own guest record or null
            this.guest = response.guest;
        } else {
            console.error('Got a guest record that could not be handled');
            console.error(response);
        }
    }

    createGuest(name: string): void {
        const wsMessage: CreateGuestRequest = {
            request: 'CREATE_GUEST',
            name,
        };
        this.sendWsMessage(wsMessage);
    }

    setGuestState(guest: Guest, state: GuestState): void {
        const wsMessage: SetGuestStateRequest = {
            request: 'SET_GUEST_STATE',
            state,
            userId: guest.userId,
        };
        this.sendWsMessage(wsMessage);
    }

    getRoomDetails(): void {
        const wsMessage: GetRoomDetailsRequest = {
            request: 'GET_ROOM_DETAILS',
        };
        this.sendWsMessage(wsMessage);
    }

    getRoomDetailsResponse(response: GetRoomDetailsResponse): void {
        this.room = response.room;
        console.log(`Got room ${this.room.roomId}`);
    }

    getRoomGuests(): void {
        const wsMessage: GetRoomGuestsRequest = {
            request: 'GET_ROOM_GUESTS',
        };
        this.sendWsMessage(wsMessage);
    }

    getRoomGuestsResponse(response: GetRoomGuestsResponse): void {
        const existingGuestIds = this.roomGuests.map((g) => g.userId);
        // TODO: Merge updates to guests
        const guestsToAdd = response.guests.filter((g) => !existingGuestIds.includes(g.userId));
        this.roomGuests.pushObjects(guestsToAdd);
    }

    setRoomGrant(grant: RoomGrant): void {
        const wsMessage: SetRoomGrantRequest = {
            request: 'SET_ROOM_GRANT',
            grant,
        };
        this.sendWsMessage(wsMessage);
    }


    deleteRoom(): void {
        const wsMessage: DeleteRoomRequest = {
            request: 'DELETE_ROOM',
        };
        this.sendWsMessage(wsMessage);
    }

    resetRoom(): void {
        const wsMessage: ResetRoomRequest = {
            request: 'RESET_ROOM',
        };
        this.sendWsMessage(wsMessage);
    }


    @enqueueTask
    verifyAuthentication = task(function* (this: Backend) {
        if (!this.currentCredentials) {
            throw Error('User must have credentials before verifying');
        }
        const aws = new AwsClient({
            accessKeyId: this.currentCredentials.accessKeyId,
            secretAccessKey: this.currentCredentials.secretAccessKey,
            sessionToken: this.currentCredentials.sessionToken,
        });

        // https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html
        const LAMBDA_FN_API = 'https://lambda.eu-west-2.amazonaws.com/2015-03-31/functions';

        const event = { roomId: this.roomId };
        console.log('invoking lambda');
        yield aws.fetch(`${LAMBDA_FN_API}/${ENV.CONNECTION_AUTH_HANDLER_NAME}/invocations`, { body: JSON.stringify(event) });
    });

    /**
     * Pings the backend for a heart beat if no response after 2 x interval + 1 seconds it will mark the room as disconnected until a heartbeat is received
     * This is called from connection.ts, so when the connection component is removed the heartbeat will stop
     */
    heartbeat(): void {
        const now = new Date().getTime();
        const interval = 10 * 1000;
        // Only heartbeat after connection is authenticated
        if (this.connectionState !== 'AWAITING_AUTH_VERIFICATION') {
            if (this.heartbeatReceivedAtTime) {
                if (this.heartbeatReceivedAtTime < now - interval * 2 + 1000) {
                    console.warn('Heartbeat missing for 10 seconds');
                    this.connectionState = this.connected ? 'MISSING_HEARTBEAT' : 'DISCONNECTED';
                } else {
                    this.connectionState = this.connected ? 'CONNECTED' : 'DISCONNECTED';
                }
            }
            if (this.connected && (this.heartbeatSentAtTime === undefined || this.heartbeatSentAtTime < now - interval)) {
                const heartbeatMessage: HeartbeatRequest = {
                    request: 'HEARTBEAT',
                };
                this.socket!.send(heartbeatMessage, true);
                this.heartbeatSentAtTime = now;
            }
        }
    }

    heartbeatResponse(response: HeartbeatResponse): void {
        console.log('Heartbeat received');
        if (this.heartbeatConnectionId && this.heartbeatConnectionId !== response.connectionId) {
            // Connection ID has changed
            // Reload the page to ensure state is synchronized
            console.log('Heartbeat connection ID has changed');
            window.location.reload();
        }
        if (!this.heartbeatConnectionId) {
            this.heartbeatConnectionId = response.connectionId;
        }
        this.heartbeatReceivedAtTime = new Date().getTime();
    }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
    interface Registry {
        'backend': Backend;
    }
}
