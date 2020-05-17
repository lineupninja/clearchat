import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import ClaimService from 'clearchat-brochure/services/claim';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

interface ClaimGrantTextArgs { }

const MAX_LENGTH = 10000;

export default class ClaimGrantText extends Component<ClaimGrantTextArgs> {
    @service claim!: ClaimService;

    get grantText(): string {
        return this.claim.grantText ? this.claim.grantText : '';
    }

    set grantText(text: string) {
        this.claim.grantText = text.substr(0, MAX_LENGTH);
        this.validateText();
    }

    @tracked
    grantTextIsValid = false;

    @action
    validateText() {
        this.grantTextIsValid = this.grantText.length > 0;
    }
}
