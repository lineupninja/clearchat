import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Backend, { Guest, GuestState } from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { later } from '@ember/runloop';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface AdminGuestArgs {
    guest: Guest;
}


export default class AdminGuest extends Component<AdminGuestArgs> {
    @service backend!: Backend;

    get hasUnreadMessages(): boolean {
        if (!this.args.guest.messageSentByUserTime) {
            // No messages received
            return false;
        }
        if (!this.args.guest.messageReadByAdminTime) {
            // No messages read
            return true;
        }
        return this.args.guest.messageSentByUserTime > this.args.guest.messageReadByAdminTime;
    }


    get hasMessages(): boolean {
        return this.args.guest.messageSentByUserTime !== undefined;
    }

    @tracked
    requestedTime = '';

    get formattedTime(): string {
        return timeAgo.format(new Date(this.args.guest.requestedAccessTime));
    }

    @action
    updateTime(): void {
        this.requestedTime = this.formattedTime;
        later(() => {
            this.updateTime();
        }, 1000);
    }

    @action
    setGuestState(guest: Guest, state: GuestState): void {
        this.backend.setGuestState(guest, state);
    }
}
