import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';

interface AdminRoomArgs { }

export default class AdminRoom extends Component<AdminRoomArgs> {
    @service backend!: Backend;
    @service modal!: unknown;

    @action
    getRoomDetails(): void {
        this.backend.getRoomDetails();
    }

    get guestLink(): string {
        return `https://${window.location.hostname}`;
    }
}
