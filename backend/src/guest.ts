import { DynamoDB } from 'aws-sdk';
import { User } from './user';
import { RoomGrant, getRoom } from './room';

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
/**
 * Returns the guest record for the user, if it exists
 */

export async function getGuestByUser(user: User): Promise<Guest | null> {
    return getGuestByRoomIdUserId(user.roomId, user.userId);
}

export async function getGuestByRoomIdUserId(roomId: string, userId: string): Promise<Guest | null> {
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const getParams: DynamoDB.DocumentClient.GetItemInput = {
        TableName: process.env.GUESTS_TABLE!,
        Key: {
            roomId,
            userId,
        },
        ConsistentRead: true,
    };

    const result = await documentClient.get(getParams).promise();

    if (result.Item) {
        return result.Item as Guest;
    }
    return null;

}

/**
 * Returns the guest record for the user, if it exists
 */

export async function getRoomGuests(roomId: string): Promise<Guest[]> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const queryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.GUESTS_TABLE!,
        KeyConditionExpression: 'roomId = :roomId',
        ExpressionAttributeValues: {
            ':roomId': roomId,
        },
        ConsistentRead: true,
    };

    const result = await documentClient.query(queryParams).promise();

    if (result.Items) {
        return result.Items as Guest[];
    }
    return [];

}

/**
 * Create a new Guest
 */

export async function createGuest(user: User, name: string): Promise<Guest> {

    // Test the userId is valid format
    const userIdParts = user.userId.split(':');
    if (userIdParts.length !== 2) {
        throw Error(`UUID ${user.userId} is not valid`);
    }
    if (userIdParts[0] !== process.env.AWS_REGION) {
        throw Error(`UUID ${user.userId} is wrong region or poorly formatted`);
    }
    if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userIdParts[1])) {
        throw Error(`UUID ${user.userId} is not valid`);
    }
    const guest: Guest = {
        roomId: user.roomId,
        userId: user.userId,
        name,
        state: 'PENDING',
        createdTime: new Date().getTime(),
        requestedAccessTime: new Date().getTime(),
    };
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    console.log('Putting');
    console.log(guest);

    const putParams: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.GUESTS_TABLE!,
        Item: guest,
    };

    await documentClient.put(putParams).promise();

    console.log('guest stored');
    return guest;
}

/**
 * Sets a guests state and returns the updated guest
 */

export async function setGuestState(roomId: string, userId: string, state: GuestState): Promise<Guest> {
    const guest = await getGuestByRoomIdUserId(roomId, userId);
    if (!guest) {
        throw Error(`No guest found for ${roomId} / ${userId}`);
    }
    const validStates: GuestState[] = ['PENDING', 'GRANTED', 'DENIED'];
    if (!validStates.includes(state)) {
        throw Error('Invalid state');
    }
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    guest.state = state;
    if (state === 'GRANTED') {
        const room = await getRoom(roomId);
        if (!room) {
            throw Error(`Failed to find room with id ${roomId}`);
        }
        guest.grant = room.grant;
    } else {
        delete guest.grant;
    }
    const putParams: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.GUESTS_TABLE!,
        Item: guest,
    };

    await documentClient.put(putParams).promise();

    console.log('guest stored');
    return guest;
}
