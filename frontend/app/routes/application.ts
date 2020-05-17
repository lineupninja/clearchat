import Route from '@ember/routing/route';
import fetch from 'fetch';
import ENV from 'clearchat-frontend/config/environment';

export type Availability = {
    available: boolean;
};

export default class Application extends Route {
    async model(): Promise<Availability> {
        let roomId: string;
        if (window.location.hostname.includes('localhost')) {
            roomId = 'local';
        } else {
            [roomId] = window.location.hostname.split('.');
            if (roomId === 'www') {
                // Redirect www to not wwww
                window.location.replace(`https://${window.location.hostname.substr(4)}/`);
            }
        }
        const availabilityResult = await fetch(`${ENV.httpApi}/availability`, {
            method: 'POST',
            body: JSON.stringify({ roomId }),
        });

        return availabilityResult.json();
    }
}
