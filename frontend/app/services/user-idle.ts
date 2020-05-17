import UserIdleService from 'ember-user-activity/services/user-idle';

export default class UserIdle extends UserIdleService {
    IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
}
