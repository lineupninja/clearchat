import EmberRouter from '@ember/routing/router';
import config from './config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('claim', { path: '/claim/:roomId' }, function() {
    this.route('grant', function() {
      this.route('link');
      this.route('text');
    });

    this.route('admin', function() {
      this.route('link');
      this.route('email');
    });

    this.route('state', function() {
      this.route('claiming');
      this.route('success');
      this.route('failed');
    });
  });
});
