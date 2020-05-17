import Component from '@glimmer/component';
import ClaimService from 'clearchat-brochure/services/claim';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

interface ClaimAdminEmailArgs { }

export default class ClaimAdminEmail extends Component<ClaimAdminEmailArgs> {
    @service claim!: ClaimService;

    get adminEmail(): string {
        return this.claim.adminEmail;
    }

    set adminEmail(email: string) {
        this.claim.adminEmail = email;
        this.adminEmailIsValid = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    }

    @tracked
    adminEmailIsValid = false;

}
