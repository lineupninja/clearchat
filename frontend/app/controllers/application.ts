import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import UserIdleService from 'ember-user-activity/services/user-idle';
import ENV from 'clearchat-frontend/config/environment';

export default class ApplicationController extends Controller {
    @service userIdle!: UserIdleService;

    queryParams = ['admin'];

    @tracked admin: string | null = null;

    /**
* Has the user ever been idle. If they have they need to reload the page
*/
    @tracked userHasBeenIdle = false;


    @action
    reloadPage(): void {
        window.location.reload();
    }

    @action
    goToBrochure(): void {
        window.location.href = ENV.brochureUrl;
    }

    constructor() {
        super(...arguments);
        this.userIdle.on('idleChanged', (isIdle: boolean) => {
            if (isIdle) {
                this.userHasBeenIdle = true;
            }
        });
    }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
    interface Registry {
        'application': ApplicationController;
    }
}
