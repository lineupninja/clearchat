declare module 'ember-websockets/services/sockets' {
    import Service from '@ember/service';

    export type EmberWebsocket = {
        socket: WebSocket;
        protocols: string[];
        on(event: 'open' | 'message' | 'close', handler: Function, scope: unknown): void;
        reconnect(): void;
        send(message: {}, stringify?: boolean): void;
    }

    export default class Websockets extends Service {
        closeSocketFor(url: string): EmberWebsocket;
        socketFor(url: string): EmberWebsocket;
    }
}
