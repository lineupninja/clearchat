import { DynamoDB } from 'aws-sdk';
import { v4 } from 'uuid';
import { User } from './user';
import { Guest, getGuestByUser, getGuestByRoomIdUserId } from './guest';

export type Message = {

    messageId: string;
    roomId: string;
    userId: string;
    content: string;
    createdTime: number;
    direction: 'IN' | 'OUT';

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


/**
 * Gets the messages for the requested user
 */
export async function getMessages(user: User): Promise<Message[]> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const queryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.MESSAGES_TABLE!,
        IndexName: process.env.MESSAGES_ROOM_USER_INDEX!,
        KeyConditionExpression: 'roomId = :roomId and userId = :userId',
        ExpressionAttributeValues: {
            ':roomId': user.roomId,
            ':userId': user.userId,
        },
    };

    const result = await documentClient.query(queryParams).promise();

    const messages: Message[] = [];
    if (result.Items) {
        for (const item of result.Items) {
            messages.push(item as Message);
        }
        return messages;
    }
    throw Error(`No Items found for ${JSON.stringify(queryParams)}`);

}

export async function getRoomMessages(roomId: string): Promise<Message[]> {
    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const queryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.MESSAGES_TABLE!,
        IndexName: process.env.MESSAGES_ROOM_USER_INDEX!,
        KeyConditionExpression: 'roomId = :roomId',
        ExpressionAttributeValues: {
            ':roomId': roomId,
        },
    };

    const result = await documentClient.query(queryParams).promise();

    const messages: Message[] = [];
    if (result.Items) {
        for (const item of result.Items) {
            messages.push(item as Message);
        }
        return messages;
    }
    throw Error('Did not get messages');
}

export type StoreMessageResult = {
    message: Message;
    guest: Guest;
};


/**
 * Store a message.
 * Returns the message, and the updated guest record (with updated sent/received message times)
 */

export async function storeMessage(user: User, messageToSend: MessageToSend): Promise<StoreMessageResult> {

    if (messageToSend.direction !== 'IN' && messageToSend.direction !== 'OUT') {
        throw Error('Invalid message direction');
    }

    const message: Message = {
        messageId: v4(),
        roomId: user.roomId,
        userId: user.userId,
        // Trim to first 280 chars
        content: messageToSend.content.substr(0, 280),
        direction: messageToSend.direction,
        createdTime: new Date().getTime(),
    };

    let guest: Guest | null;

    // Outbound messages are sent by admins, replace the userId with the id of the destination user
    if (messageToSend.direction === 'OUT') {

        if (user.isAdmin) {
            message.userId = messageToSend.userId;

            guest = await getGuestByRoomIdUserId(user.roomId, message.userId);
            if (!guest) {
                throw Error(`Could not find guest record for outbound message to ${user.userId}`);
            }

        } else {
            throw Error('User tried to send an admin message but they are not admin');
        }
    } else {
        guest = await getGuestByUser(user);
        if (!guest) {
            throw Error(`Could not find guest record for inbound message from ${user.userId}`);

        }
    }

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const transactWriteItems: DynamoDB.DocumentClient.TransactWriteItem[] = [];

    const putMessageParams: DynamoDB.DocumentClient.PutItemInput = {
        TableName: process.env.MESSAGES_TABLE!,
        Item: message,
    };

    transactWriteItems.push({ Put: putMessageParams });

    if (messageToSend.direction === 'IN') {
        guest.messageSentByUserTime = new Date().getTime();

        const updateGuestParams: DynamoDB.DocumentClient.Update = {
            TableName: process.env.GUESTS_TABLE!,
            Key: {
                roomId: guest.roomId,
                userId: guest.userId,

            },
            UpdateExpression: 'set messageSentByUserTime = :messageSentByUserTime',
            ExpressionAttributeValues: {
                ':messageSentByUserTime': guest.messageSentByUserTime,
            },
        };

        transactWriteItems.push({ Update: updateGuestParams });
    }


    const putTransactionParams: DynamoDB.DocumentClient.TransactWriteItemsInput = {
        TransactItems: transactWriteItems,
    };

    console.log(JSON.stringify(putTransactionParams));
    await documentClient.transactWrite(putTransactionParams).promise();

    console.log('message stored');
    return { message, guest };
}
