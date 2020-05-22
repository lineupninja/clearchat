import Component from '@glimmer/component';

import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { tracked } from '@glimmer/tracking';
import { Guest } from 'clearchat-frontend/models/guest';

interface MessagesArgs { }

export default class Messages extends Component<MessagesArgs> {
    @service backend!: Backend;

    @alias('backend.guest') guest!: Guest | null | undefined;

    @tracked
    validatedGuestName = '';

    get guestName(): string {
        return this.validatedGuestName;
    }
    set guestName(name: string) {
        this.validatedGuestName = name;
        if (name.length > 2) {
            this.guestNameIsValid = true;
        }
    }

    @tracked
    guestNameIsValid = false;

    @action
    getGuest(): void {
        this.backend.getGuest();
    }

    @action
    createGuest(): void {
        this.backend.createGuest(this.guestName);
    }

    @action
    inputKeyPressed(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.createGuest();
        }
    }
}
