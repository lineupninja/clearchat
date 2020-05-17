import Component from '@glimmer/component';
import { Message } from 'clearchat-frontend/services/backend';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { tracked } from '@glimmer/tracking';
import { later } from '@ember/runloop';
import { action } from '@ember/object';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

interface MessagesMessageArgs {
    message: Message;
}

export default class MessagesMessage extends Component<MessagesMessageArgs> {
    @tracked
    displayTime = '';

    get formattedTime(): string {
        return timeAgo.format(new Date(this.args.message.createdTime));
    }

    @action
    updateTime(): void {
        this.displayTime = this.formattedTime;
        later(() => {
            this.updateTime();
        }, 1000);
    }
}
