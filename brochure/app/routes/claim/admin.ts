import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';

export default class ClaimAdminRoute extends Route {
    @service claim!: ClaimService;

    beforeModel(): void {
        // Check the user has specified a grant mode and grant text
        if (!this.claim.grantMode || !this.claim.grantText) {
            this.replaceWith('claim.grant.index');
        }
    }

    model(): void {
        this.claim.adminMode = 'EMAIL';
    }
}
