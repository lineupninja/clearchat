import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import Backend from 'clearchat-frontend/services/backend';
import { restartableTask, task } from 'ember-concurrency-decorators';
import { timeout } from 'ember-concurrency';

interface ConnectionArgs {
    adminToken: string | null;
}

export default class Connection extends Component<ConnectionArgs> {
    @service backend!: Backend;

    /**
     * Pings the backend every 'interval' seconds, if no response after 2 x interval + 1 seconds it will mark the room as disconnected until a heartbeat is received
     * Restartable task because it calls itself at the end
     */
    @restartableTask
    heartbeat = task(function* (this: Connection) {
        this.backend.heartbeat();
        yield timeout(1000);
        this.heartbeat.perform();
    });
}
