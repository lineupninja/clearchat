import Component from '@glimmer/component';
import ENV from 'clearchat-brochure/config/environment';
import { alias } from '@ember/object/computed';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import { tracked } from '@glimmer/tracking';

interface PageClaimArgs {
    roomId: string;
}

export type GrantMode = 'LINK' | 'TEXT';
export type AdminMode = 'LINK' | 'EMAIL';


export default class PageClaim extends Component<PageClaimArgs> {
    @service router!: RouterService;

    env = ENV;

    @alias('env.baseDomain') baseDomain!: string;

    @tracked grantText = '';

    @tracked
    grantMode: GrantMode = 'LINK';

    @tracked
    adminMode: AdminMode = 'EMAIL';

    @tracked
    adminEmail = '';

    @tracked
    adminLink = '';

    @tracked
    adminEmailIsValid = false;

    @tracked
    grantTextIsValid = false;

    @action
    changeRoomName() {
        this.router.transitionTo('index');
    }

    @action
    copyAdminLink() {
        const textAreaElement = document.getElementById('adminLink') as HTMLTextAreaElement | null;
        if (textAreaElement) {
            textAreaElement.disabled = false;
            textAreaElement.select();
            const copied = document.execCommand('copy');
            textAreaElement.disabled = true;
            if (copied) {
                console.log('copied ok');
            } else {
                console.error('could not copy');
            }
        }
    }

}
