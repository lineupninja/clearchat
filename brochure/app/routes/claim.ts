import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';

export default class ClaimRoute extends Route {
    @service claim!: ClaimService;

    model(params: { roomId: string }): void {
        this.claim.roomId = params.roomId;
    }
}
