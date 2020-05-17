import Component from '@glimmer/component';

import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Backend from 'clearchat-frontend/services/backend';
import { tracked } from '@glimmer/tracking';

interface MessagesSendArgs {
    userId?: string;
}

const MAX_LENGTH = 280;

export default class MessagesSend extends Component<MessagesSendArgs> {
    @service backend!: Backend;

    @tracked
    validatedMessageContent = '';

    get messageContent(): string {
        return this.validatedMessageContent;
    }

    set messageContent(message: string) {
        if (message.length > MAX_LENGTH) {
            this.validatedMessageContent = message.substr(0, MAX_LENGTH);
        } else {
            this.validatedMessageContent = message;
        }
    }

    @action
    inputKeyPressed(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    @action
    sendMessage(): void {
        if (this.args.userId) {
            this.backend.sendAdminMessage(this.args.userId, this.messageContent);
        } else {
            this.backend.sendMessage(this.messageContent);
        }
        this.messageContent = '';
    }
}
