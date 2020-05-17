import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';

export default class ClaimAdminLinkRoute extends Route {
    @service claim!: ClaimService;

    model(): void {
        this.claim.adminMode = 'LINK';
    }
}
