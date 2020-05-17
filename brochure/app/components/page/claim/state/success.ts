import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';
interface ClaimStateSuccessArgs { }

export default class ClaimStateSuccess extends Component<ClaimStateSuccessArgs> {

    @service claim!: ClaimService;
}
