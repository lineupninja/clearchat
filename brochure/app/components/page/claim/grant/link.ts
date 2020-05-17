import Component from '@glimmer/component';
import ClaimService from 'clearchat-brochure/services/claim';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import RouterService from '@ember/routing/router-service';

interface ClaimGrantLinkArgs { }
const MAX_LENGTH = 10000;

export default class ClaimGrantLink extends Component<ClaimGrantLinkArgs> {
    @service claim!: ClaimService;
    @service router!: RouterService;

    get grantText(): string {
        return this.claim.grantText ? this.claim.grantText : '';
    }

    set grantText(text: string) {
        this.claim.grantText = text.substr(0, MAX_LENGTH);
        this.validateText();
    }

    @action
    inputKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.router.transitionTo('claim.admin.index')
        }
    }

    @tracked
    grantTextIsValid = false;

    @action
    validateText() {
        this.grantTextIsValid = /^(?:http(s)?:\/\/)+[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/.test(this.grantText);
    }

}
