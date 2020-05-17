import { DynamoDB } from 'aws-sdk';
import { v4 } from 'uuid';
import * as mail from '@sendgrid/mail';
import { getRoomGuests, Guest } from './guest';
import { getRoomMessages } from './message';

export type GrantMode = 'LINK' | 'TEXT';
export type AdminMode = 'LINK' | 'EMAIL';

export type RoomGrant = {
    mode: GrantMode;
    text: string;
};

export type Room = {
    roomId: string;
    creator: string;
    createdTime: number;
    accessedTime: number;
    email?: string;
    grant: RoomGrant;
    adminToken: string;
};


type ClaimRequestAdminEmail = {
    mode: 'EMAIL';
    email: string;
};

type ClaimRequestAdminLink = {
    mode: 'LINK';
};

export type ClaimRequest = {
    roomId: string;
    grant: {
        mode: GrantMode;
        text: string;
    };
    admin: ClaimRequestAdminEmail | ClaimRequestAdminLink;
};

type ClaimResponseSuccess = {
    success: true;
    adminLink: string;
    guestLink: string;
};

type ClaimResponseFailure = {
    success: false;
    reason: string;
};

export type ClaimResponse = ClaimResponseSuccess | ClaimResponseFailure;

function validateGrant(grant: RoomGrant): boolean {
    if (grant.mode !== 'LINK' && grant.mode !== 'TEXT') {
        return false;
    }

    if (grant.text.length > 10000) {
        return false;
    }
    return true;

}

export async function handleClaimRoom(params: ClaimRequest, creator: string): Promise<ClaimResponse> {
    // First check the room is available
    const available = await checkRoomAvailability(params.roomId);
    if (!available) {
        return {
            success: false,
            reason: 'ROOM_NOT_AVAILABLE',
        };
    }
    // Validate roomId
    if (!/^[a-z0-9-]*$/.test(params.roomId)) {
        return {
            success: false,
            reason: 'ROOM_NOT_VALID',
        };
    }
    if (params.admin.mode !== 'EMAIL' && params.admin.mode !== 'LINK') {
        return {
            success: false,
            reason: 'ADMIN_MODE_NOT_VALID',
        };
    }
    if (params.admin.mode === 'EMAIL' && !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(params.admin.email)) {
        return {
            success: false,
            reason: 'EMAIL_NOT_VALID',
        };
    }
    if (!validateGrant(params.grant)) {
        return {
            success: false,
            reason: 'GRANT_NOT_VALID',
        };
    }
    const room = await createRoom({
        roomId: params.roomId,
        creator,
        grant: params.grant,
    });

    const adminLink = `https://${params.roomId}.${process.env.ZONE_NAME}/?admin=${room.adminToken}`;
    const guestLink = `https://${params.roomId}.${process.env.ZONE_NAME}`;

    if (params.admin.mode === 'EMAIL') {
        await sendAdminEmail(params.admin.email, params.roomId, adminLink, guestLink);
    }

    return {
        success: true,
        adminLink,
        guestLink,
    };
}

async function sendAdminEmail(email: string, roomId: string, adminLink: string, guestLink: string): Promise<void> {
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
        throw Error('SENDGRID_API_KEY must be defined in environment');
    }
    mail.setApiKey(key);
    const msg = {
        to: email,
        from: 'ClearChat Admin Link <admin-link@clearchat.cc>',
        subject: `Your admin link for ${roomId}.clearchat.cc`,
        // tslint:disable-next-line:no-multiline-string
        text: `
Hi,

To administer ${roomId}.${process.env.ZONE_NAME} use this address:

${adminLink}

The admin link can be shared with other members of your team if would would like to collaborate on approvals.

To invite guests use this address:

${guestLink}

Thanks,

clearchat.cc

Powered by Lineup Ninja. Modern speaker management tools for exhibitions, conferences and awards

https://lineup.ninja
  `,
        trackingSettings: {
            clickTracking: {
                enable: false,
                enableText: false,
            },
            openTracking: {
                enable: false,
            },
        },
    };
    await mail.send(msg);

}

export type CreateRoom = {
    roomId: string;
    email?: string;
    creator: string;
    grant: {
        mode: GrantMode;
        text: string;
    };
};

export async function createRoom(params: CreateRoom): Promise<Room> {

    const room: Room = {
        roomId: params.roomId,
        creator: params.creator,
        createdTime: new Date().getTime(),
        accessedTime: new Date().getTime(),
        email: params.email,
        grant: params.grant,
        adminToken: v4(),
    };

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    console.log('Putting');
    console.log(room);

    const putParams: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.ROOMS_TABLE!,
        Item: room,
    };

    await documentClient.put(putParams).promise();

    console.log('room created');
    return room;

}


export type AvailabilityRequest = {
    roomId: string;
};

type AvailabilityResponse = {
    available: boolean;
};

export async function handleRoomAvailability(params: AvailabilityRequest): Promise<AvailabilityResponse> {
    if (!/^[a-z0-9-]+$/.test(params.roomId)) {
        return { available: false };
    }
    const available = await checkRoomAvailability(params.roomId);
    console.log(`room is available? ${available}`);
    return { available };
}

/**
 * Returns true if the requested roomId is available
 */
export async function checkRoomAvailability(roomId: string): Promise<boolean> {

    const reserved = [
        'admin',
        'api',
        'app',
        'beta',
        'blog',
        'dev',
        'events',
        'forum',
        'forums',
        'ftp',
        'go',
        'help',
        'http',
        'imap',
        'info',
        'int',
        'kb',
        'lineup-ninja',
        'lineup',
        'lineupninja',
        'live',
        'm',
        'mail',
        'media',
        'mobile',
        'news',
        'ninja',
        'ns1',
        'ns2',
        'ns3',
        'poo',
        'prod',
        'smtp',
        'static',
        'support',
        'test',
        'vpn',
        'webmail',
        'wiki',
        'ws',
        'www',
    ];

    if (reserved.includes(roomId)) { return false; }

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
    const getParams = {
        TableName: process.env.ROOMS_TABLE!,
        Key: {
            roomId,
        },
    };
    console.log('Getting');
    console.log(getParams);
    const result = await documentClient.get(getParams).promise();
    console.log(result);
    if (result.Item) {
        return false;
    }
    return true;
}

/**
 * Get the Room
 */
export async function getRoom(roomId: string): Promise<Room | null> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
    const getParams = {
        TableName: process.env.ROOMS_TABLE!,
        Key: {
            roomId,
        },
    };
    console.log('Getting room');
    console.log(getParams);
    const result = await documentClient.get(getParams).promise();
    console.log(result);
    if (result.Item) {
        return result.Item as Room;
    }
    return null;

}

/**
 * Update the accessed time on the room
 */
export async function updateRoomAccessedTime(room: Room): Promise<void> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const updateRoomAccessedTimeParams: DynamoDB.DocumentClient.Update = {
        TableName: process.env.ROOMS_TABLE!,
        Key: {
            roomId: room.roomId,
        },
        UpdateExpression: 'set accessedTime = :now',
        ExpressionAttributeValues: {
            ':now': new Date().getTime(),
        },
    };

    await documentClient.update(updateRoomAccessedTimeParams).promise();

}

/**
 * Update the grant on an existing room. Updates the room and all approved guests. Returns the guests that need to be updated
 */
export async function updateRoomGrant(roomId: string, grant: RoomGrant): Promise<Guest[]> {

    if (!validateGrant(grant)) {
        return [];
    }
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    let updates: DynamoDB.DocumentClient.Update[] = [];

    const updateRoomAccessedTimeParams: DynamoDB.DocumentClient.Update = {
        TableName: process.env.ROOMS_TABLE!,
        Key: {
            roomId,
        },
        UpdateExpression: 'set #grant = :grant',
        ExpressionAttributeValues: {
            ':grant': grant,
        },
        ExpressionAttributeNames: {
            '#grant': 'grant',
        },
    };

    updates.push(updateRoomAccessedTimeParams);

    const approvedGuests = (await getRoomGuests(roomId)).filter((g) => g.state === 'GRANTED');

    for (const guest of approvedGuests) {
        guest.grant = grant;
        const updateGuestParams: DynamoDB.DocumentClient.Update = {
            TableName: process.env.GUESTS_TABLE!,
            Key: {
                roomId,
                userId: guest.userId,

            },
            UpdateExpression: 'set #grant = :grant',
            ExpressionAttributeValues: {
                ':grant': grant,
            },
            ExpressionAttributeNames: {
                '#grant': 'grant',
            },
        };
        updates.push(updateGuestParams);
    }

    while (updates.length > 0) {
        // Max batch size is 25 items
        const itemsInTransaction = updates.slice(0, 25);
        const transaction: DynamoDB.DocumentClient.TransactWriteItemsInput = {
            TransactItems: itemsInTransaction.map((item) => ({ Update: item })),
        };
        await documentClient.transactWrite(transaction).promise();
        updates = updates.slice(25);
    }


    return approvedGuests;
}

/**
 * Delete a room including all guests, messages etc.
 */
export async function deleteRoom(roomId: string): Promise<void> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    let deletes: DynamoDB.DocumentClient.DeleteItemInput[] = [];

    // Room
    const deleteRoomParams: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: process.env.ROOMS_TABLE!,
        Key: {
            roomId,
        },
    };
    deletes.push(deleteRoomParams);
    // Guests
    const guests = await getRoomGuests(roomId);
    for (const guest of guests) {
        const deleteGuestParams: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: process.env.GUESTS_TABLE!,
            Key: {
                roomId,
                userId: guest.userId,
            },
        };
        deletes.push(deleteGuestParams);
    }
    // Messages
    const messages = await getRoomMessages(roomId);
    for (const message of messages) {
        const deleteMessageParams: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: process.env.MESSAGES_TABLE!,
            Key: {
                messageId: message.messageId,
            },
        };
        deletes.push(deleteMessageParams);
    }

    while (deletes.length > 0) {
        // Max batch size is 25 items
        const itemsInTransaction = deletes.slice(0, 25);
        const transaction: DynamoDB.DocumentClient.TransactWriteItemsInput = {
            TransactItems: itemsInTransaction.map((item) => ({ Delete: item })),
        };
        await documentClient.transactWrite(transaction).promise();
        deletes = deletes.slice(25);
    }

}
/**
 * Delete a room including all guests, messages etc.
 */
export async function resetRoom(roomId: string): Promise<void> {
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    let deletes: DynamoDB.DocumentClient.DeleteItemInput[] = [];

    // Guests
    const guests = await getRoomGuests(roomId);
    for (const guest of guests) {
        if (guest.userId) {
            const deleteGuestParams: DynamoDB.DocumentClient.DeleteItemInput = {
                TableName: process.env.GUESTS_TABLE!,
                Key: {
                    roomId,
                    userId: guest.userId,
                },
            };
            deletes.push(deleteGuestParams);
        }
    }
    // Messages
    const messages = await getRoomMessages(roomId);
    for (const message of messages) {
        const deleteMessageParams: DynamoDB.DocumentClient.DeleteItemInput = {
            TableName: process.env.MESSAGES_TABLE!,
            Key: {
                messageId: message.messageId,
            },
        };
        deletes.push(deleteMessageParams);
    }

    console.log(JSON.stringify(deletes));
    while (deletes.length > 0) {
        // Max batch size is 25 items
        const itemsInTransaction = deletes.slice(0, 25);
        const transaction: DynamoDB.DocumentClient.TransactWriteItemsInput = {
            TransactItems: itemsInTransaction.map((item) => ({ Delete: item })),
        };
        await documentClient.transactWrite(transaction).promise();
        /*
        for (const item of itemsInTransaction) {
            console.log(JSON.stringify(item));
            await documentClient.delete(item).promise();
        }
        */
        deletes = deletes.slice(25);
    }

}
