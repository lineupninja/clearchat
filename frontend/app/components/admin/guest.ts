import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { later } from '@ember/runloop';
import { Guest, GuestState } from 'clearchat-frontend/models/guest';

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
        this.backend.setGuestState(guest, state, undefined);
    }

    /**
     * When the 'details' view is displayed update the admin read time for the messages for the guest
     */
    @action
    detailsToggled(event: Event) {
        if (event.currentTarget && (event.currentTarget as HTMLDetailsElement).open) {
            this.args.guest.startAdminIsReadingMessages();
        } else {
            this.args.guest.stopAdminIsReadingMessages();
        }
    }

    /**
     * When the component is removed ensure that new messages are not marked as read
     */

    @action
    stopReadingMessages() {
        this.args.guest.stopAdminIsReadingMessages();
    }
}
