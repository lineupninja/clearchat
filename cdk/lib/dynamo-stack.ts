/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-implied-eval */
import * as cdk from '@aws-cdk/core';
import { Table, BillingMode, AttributeType, ProjectionType } from '@aws-cdk/aws-dynamodb';
import { RemovalPolicy, Duration, Fn } from '@aws-cdk/core';
import * as path from 'path';

export interface DynamoStackProps extends cdk.StackProps {
    namePrefix: string;
}

export type DynamoTables = {
    adminConnectionsTable: Table;
    connectionsTable: Table;
    connectionsTableRoomUserIndexName: string;
    guestsTable: Table;
    messagesTable: Table;
    messagesTableRoomUserIndexName: string;
    roomsTable: Table;
    userConnectionsTable: Table;
};


export class DynamoStack extends cdk.Stack {

    readonly tables: DynamoTables;

    constructor(scope: cdk.Construct, id: string, props: DynamoStackProps) {
        super(scope, id, props);

        // https://github.com/aws-samples/simple-websockets-chat-app/blob/master/template.yaml

        const connectionsTable = new Table(this, 'ConnectionsTable', {
            tableName: `${props.namePrefix}-Connections`,
            partitionKey: {
                name: 'connectionId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,

        });

        const connectionsTableRoomUserIndexName = `${props.namePrefix}-RoomUserConnections`;
        connectionsTable.addGlobalSecondaryIndex({
            indexName: connectionsTableRoomUserIndexName,
            partitionKey: {
                name: 'roomId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            projectionType: ProjectionType.ALL,
        });

        const userConnectionsTable = new Table(this, 'UserConnectionsTable', {
            tableName: `${props.namePrefix}-UserConnections`,
            partitionKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'roomId_connectionId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const adminConnectionsTable = new Table(this, 'AdminConnectionsTable', {
            tableName: `${props.namePrefix}-AdminConnections`,
            partitionKey: {
                name: 'roomId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });


        const messagesTable = new Table(this, 'MessagesTable', {
            tableName: `${props.namePrefix}-Messages`,
            partitionKey: {
                name: 'messageId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,

        });

        const messagesTableRoomUserIndexName = `${props.namePrefix}-RoomUserMessages`;

        messagesTable.addGlobalSecondaryIndex({
            indexName: messagesTableRoomUserIndexName,
            partitionKey: {
                name: 'roomId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            projectionType: ProjectionType.ALL,
        });

        const guestsTable = new Table(this, 'GuestsTable', {
            tableName: `${props.namePrefix}-Guests`,
            partitionKey: {
                name: 'roomId',
                type: AttributeType.STRING,
            },
            sortKey: {
                name: 'userId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const roomsTable = new Table(this, 'RoomsTable', {
            tableName: `${props.namePrefix}-Rooms`,
            partitionKey: {
                name: 'roomId',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            serverSideEncryption: true,
            removalPolicy: RemovalPolicy.DESTROY,
        });


        this.tables = {
            adminConnectionsTable,
            connectionsTable,
            connectionsTableRoomUserIndexName,
            guestsTable,
            messagesTable,
            messagesTableRoomUserIndexName,
            roomsTable,
            userConnectionsTable,
        };

    }
}
