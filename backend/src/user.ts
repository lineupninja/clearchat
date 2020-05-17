import { DynamoDB } from 'aws-sdk';
import { TransactWriteItemsInput } from 'aws-sdk/clients/dynamodb';

export type User = {

    userId: string;
    connectionId: string;
    roomId: string;
    isAdmin: boolean;
    authenticated: boolean;
};

export type UserConnection = {
    userId: string;
    roomId_connectionId: string;
    isAdmin: boolean;
};

export type AdminConnection = {
    roomId: string;
    userId: string;
    connectionId: string;
};


export async function getUserFromConnectionId(id: string): Promise<User | null> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
    const getParams = {
        TableName: process.env.CONNECTIONS_TABLE!,
        Key: {
            connectionId: id,
        },
        ConsistentRead: true,
    };
    console.log('Getting');
    console.log(getParams);
    const result = await documentClient.get(getParams).promise();

    if (result.Item) {
        return result.Item as User;
    }
    return null;
}


export async function getConnectionIdsForRoomUser(roomId: string, userId: string): Promise<string[]> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
    const queryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.USER_CONNECTIONS_TABLE!,
        KeyConditionExpression: 'userId = :userId and begins_with(roomId_connectionId, :roomId)',
        ExpressionAttributeValues: {
            ':roomId': roomId,
            ':userId': userId,
        },
        ConsistentRead: true,
    };
    console.log('Querying');
    console.log(queryParams);

    const result = await documentClient.query(queryParams).promise();
    const items = result.Items as UserConnection[];
    if (!items) {
        throw Error('Got no items in response');
    }

    return items.map((i) => i.roomId_connectionId.split('::')[1]);

}

export async function getConnectionIdsForRoomAdmins(roomId: string): Promise<string[]> {

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
    const queryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: process.env.ADMIN_CONNECTIONS_TABLE!,
        KeyConditionExpression: 'roomId = :roomId',
        ExpressionAttributeValues: {
            ':roomId': roomId,
        },
        ConsistentRead: true,
    };
    console.log('Querying Room Admins');
    console.log(queryParams);

    const result = await documentClient.query(queryParams).promise();
    const items = result.Items as AdminConnection[];
    if (!items) {
        throw Error('Got no items in response');
    }

    return items.map((i) => i.connectionId);

}

export async function markConnectionIdsAuthenticated(connectionIds: string[]): Promise<void> {

    const connectionsTable = process.env.CONNECTIONS_TABLE!;

    const documentClient = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

    const items: DynamoDB.DocumentClient.TransactWriteItemList = [];

    for (const connectionId of connectionIds) {

        const updateConnectionAuthenticatedParams: DynamoDB.DocumentClient.Update = {
            TableName: connectionsTable,
            Key: {
                connectionId,
            },
            UpdateExpression: 'set authenticated = :true',
            ExpressionAttributeValues: {
                ':true': true,
            },
        };
        items.push({ Update: updateConnectionAuthenticatedParams });
    }

    const updateConnectionsAuthenticatedParams: DynamoDB.DocumentClient.TransactWriteItemsInput = {
        TransactItems: items,
    };

    await documentClient.transactWrite(updateConnectionsAuthenticatedParams).promise();

}
