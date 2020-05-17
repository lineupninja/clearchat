import Component from '@glimmer/component';
import ENV from 'clearchat-brochure/config/environment';
import { alias } from '@ember/object/computed';
import { timeout } from 'ember-concurrency';
import { task, restartableTask } from 'ember-concurrency-decorators';
import { tracked } from '@glimmer/tracking';
import fetch from 'fetch';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import RouterService from '@ember/routing/router-service';

interface RoomAvailabilityArgs { }

type Availability = {
    available: boolean;
};

export default class RoomAvailability extends Component<RoomAvailabilityArgs> {
    @service router!: RouterService;

    @tracked
    roomId = '';

    @tracked
    validatedRoomId = '';

    @tracked
    showCharacterWarning = false;

    env = ENV;

    @tracked
    available: 'VALIDATING' | 'YES' | 'NO' = 'NO';

    @alias('env.baseDomain') baseDomain!: string;

    @restartableTask
    inputKeyUp = task(function* (this: RoomAvailability) {
        this.available = 'VALIDATING';
        timeout(100);

        this.roomId = this.roomId.toLowerCase();

        const validRoomId = this.roomId.replace(/([^a-z0-9-]+)/gi, '');

        if (this.roomId !== validRoomId) {
            this.showCharacterWarning = true;
        }

        this.roomId = validRoomId;

        // value is the current text entry value
        const testingRoomId = this.roomId;
        // const availabilityResult2 = yield fetch(`${ENV.httpApi}/availability?roomId=${testingRoomId}`);

        const availabilityResult = yield fetch(`${ENV.httpApi}/availability`, {
            method: 'POST',
            body: JSON.stringify({ roomId: testingRoomId }),
        });

        console.log(availabilityResult);
        const availability: Availability = yield availabilityResult.json();
        if (testingRoomId !== this.roomId) {
            console.warn('ID has changes since check started, ignoring this response');
        }
        if (availability.available) {
            this.validatedRoomId = testingRoomId;
            this.available = 'YES';
        } else {
            this.available = 'NO';
        }
    });

    @action
    claimRoom() {
        if (this.validatedRoomId === this.roomId) {
            this.router.transitionTo('claim.grant.index', this.validatedRoomId);
        }
    }
}
