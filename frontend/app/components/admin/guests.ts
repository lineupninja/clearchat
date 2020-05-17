import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';

interface RoomGuestsArgs { }

export default class RoomGuests extends Component<RoomGuestsArgs> {

    @service backend!: Backend;

    @action
    getRoomGuests(): void {
        this.backend.getRoomGuests();
        this.backend.getRoomMessages();
    }

}
