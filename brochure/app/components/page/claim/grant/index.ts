import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';

interface ClaimGrantIndexArgs { }

export default class ClaimGrantIndex extends Component<ClaimGrantIndexArgs> {
    @service claim!: ClaimService;
}
