declare module 'ember-user-activity/services/user-idle' {
    import Service from '@ember/service';

    export default class UserIdleService extends Service {
        on(event: 'idleChanged', handler: Function): void;
    }
}
