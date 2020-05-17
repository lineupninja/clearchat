import Service, { inject as service } from '@ember/service';
import { dropTask, task } from 'ember-concurrency-decorators';
import { tracked } from '@glimmer/tracking';
import ENV from 'clearchat-brochure/config/environment';
import RouterService from '@ember/routing/router-service';

type GrantMode = 'LINK' | 'TEXT';
type AdminMode = 'LINK' | 'EMAIL';

type ClaimRequestAdminEmail = {
    mode: 'EMAIL';
    email: string;
};

type ClaimRequestAdminLink = {
    mode: 'LINK';
};

type ClaimRequest = {
    roomId: string;
    grant: {
        mode: GrantMode;
        text: string;
    };
    admin: ClaimRequestAdminEmail | ClaimRequestAdminLink;
};

type ClaimResponseSuccess = {
    success: true;
    adminLink: string;
    guestLink: string;
};

type ClaimResponseFailure = {
    success: false;
    reason: string;
};

type ClaimResponse = ClaimResponseSuccess | ClaimResponseFailure;


export default class ClaimService extends Service {
    @service router!: RouterService;

    env = ENV;

    @tracked
    roomId = '';

    get roomDomain(): string {
        return `${this.roomId}.${ENV.baseDomain}`;
    }

    @tracked
    adminMode: AdminMode | undefined = 'EMAIL';

    @tracked
    adminLink: string | undefined;

    @tracked
    grantMode: GrantMode | undefined;

    @tracked
    adminEmail = '';

    @tracked
    grantText: string | undefined;

    @dropTask
    claimRoom = task(function* (this: ClaimService) {
        if (!this.grantMode || !this.grantText || !this.adminMode) {
            this.router.transitionTo('claim.grant.index');
            return;
        }
        if (this.adminMode === 'EMAIL' && !this.adminEmail) {
            this.router.transitionTo('claim.grant.index');
            return;
        }
        this.router.transitionTo('claim.state.claiming');
        const adminRequest: ClaimRequestAdminEmail | ClaimRequestAdminLink = this.adminMode === 'EMAIL' ? {
            mode: 'EMAIL',
            email: this.adminEmail,
        } : { mode: 'LINK' };
        const claimRequest: ClaimRequest = {
            roomId: this.roomId,
            grant: {
                mode: this.grantMode,
                text: this.grantText,
            },
            admin: adminRequest,
        };

        const claimResult = yield fetch(`${ENV.httpApi}/claim`, {
            method: 'POST',
            body: JSON.stringify(claimRequest),
        });

        console.log(claimResult);
        const claimResponse: ClaimResponse = yield claimResult.json();
        console.dir(claimResponse);

        if (claimResponse.success) {
            this.adminLink = claimResponse.adminLink;
            this.router.transitionTo('claim.state.success');
        } else {
            this.adminLink = undefined;
            this.router.transitionTo('claim.state.failed');
        }
    });
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
    interface Registry {
        'claim': ClaimService;
    }
}
