
import { v4 } from 'uuid';
import { expect } from 'chai';
import { User } from '../user';
import { getMessages, storeMessage, MessageToSend } from '../message';

process.env.CONNECTIONS_TABLE = 'dev-clearchat-cc-Connections';
process.env.CONNECTIONS_TABLE_ROOM_LEVEL_INDEX = 'dev-clearchat-cc-RoomLevelConnections';
process.env.CONNECTIONS_TABLE_ROOM_USER_INDEX = 'dev-clearchat-cc-RoomUserConnections';
process.env.MESSAGES_TABLE = 'dev-clearchat-cc-Messages';
process.env.MESSAGES_ROOM_USER_INDEX = 'dev-clearchat-cc-RoomUserMessages';
process.env.AWS_REGION = 'eu-west-2';

const user: User = {
    userId: `mocha-user-1-${v4()}`,
    connectionId: 'mocha-connection-1',
    isAdmin: false,
    roomId: 'mocha-room-1',
    authenticated: true,
};


describe('Messages', function (): void {
    this.timeout(10000);
    it('should send a message', async () => {

        const messageToSend: MessageToSend = {
            content: 'mocha-message-1',
            direction: 'IN',
        };

        const { message, guest } = await storeMessage(user, messageToSend);

        expect(message.roomId).to.equal(user.roomId);
        expect(message.userId).to.equal(user.userId);
        expect(message.content).to.equal(messageToSend.content);
        expect(message.direction).to.equal('IN');
        expect(message.createdTime).to.be.above(1);

        expect(guest.userId).to.equal(user.userId);
        expect(guest.messageSentByUserTime).to.be.above(1);
    });

    it('should get a message', async () => {
        const messages = await getMessages(user);
        expect(messages.length, 'one message received').to.equal(1);
        const message = messages[0];
        expect(message.userId).to.equal(user.userId);
        expect(message.content).to.equal('mocha-message-1');
        expect(message.direction).to.equal('IN');
    });

});
