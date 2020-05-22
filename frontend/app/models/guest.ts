import Backend, { RoomGrant } from 'clearchat-frontend/services/backend';
import { tracked } from '@glimmer/tracking';
export type GuestState = 'PENDING' | 'GRANTED' | 'DENIED';

export type GuestConfig = {
    roomId: string;
    userId: string;
    name: string;
    state: GuestState;
    createdTime: number;
    requestedAccessTime: number;
    messageSentByUserTime?: number;
    messageReadByAdminTime?: number;
    grant?: RoomGrant;
};

export class Guest {

    backend: Backend;

    @tracked
    roomId: string;

    @tracked
    userId: string;

    @tracked
    name: string;

    @tracked
    state: GuestState;

    @tracked
    createdTime: number;

    @tracked
    requestedAccessTime: number;

    @tracked
    private messageSentByUserTimeStore?: number;

    public get messageSentByUserTime(): number | undefined {
        return this.messageSentByUserTimeStore;
    }

    public set messageSentByUserTime(time: number | undefined) {
        if (this.messageSentByUserTimeStore !== time) {
            if (this.adminIsReadingMessages) {
                // Admin is currently reading messages, mark it read automatically
                this.backend.setGuestState(this, this.state, new Date().getTime());
            }
            this.messageSentByUserTimeStore = time;
        }
    }

    @tracked
    messageReadByAdminTime?: number;

    @tracked
    grant?: RoomGrant;

    private adminIsReadingMessages = false;

    startAdminIsReadingMessages() {
        this.adminIsReadingMessages = true;
        this.backend.setGuestState(this, this.state, new Date().getTime());
    }

    stopAdminIsReadingMessages() {
        this.adminIsReadingMessages = false;
    }

    constructor(guest: GuestConfig, backend: Backend) {
        this.backend = backend;
        this.roomId = guest.roomId;
        this.userId = guest.userId;
        this.name = guest.name;
        this.state = guest.state;
        this.createdTime = guest.createdTime;
        this.requestedAccessTime = guest.requestedAccessTime;
        this.messageSentByUserTime = guest.messageSentByUserTime;
        this.messageReadByAdminTime = guest.messageReadByAdminTime;
        this.grant = guest.grant;
    }
};