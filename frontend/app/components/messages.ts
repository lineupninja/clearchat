import Component from '@glimmer/component';

import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';

interface MessagesArgs {
    userId?: string;
    getMessagesFromBackend: boolean;
}

export default class Messages extends Component<MessagesArgs> {
    @service backend!: Backend;

    @action
    getMessages(): void {
        if (this.args.getMessagesFromBackend) {
            this.backend.getMessages();
        }
    }
}
