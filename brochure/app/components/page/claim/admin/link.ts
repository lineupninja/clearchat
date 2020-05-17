import Component from '@glimmer/component';
import ClaimService from 'clearchat-brochure/services/claim';
import { inject as service } from '@ember/service';

interface ClaimAdminLinkArgs { }

export default class ClaimAdminLink extends Component<ClaimAdminLinkArgs> {
    @service claim!: ClaimService;
}
