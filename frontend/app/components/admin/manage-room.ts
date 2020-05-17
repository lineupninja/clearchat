import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import Backend, { Room, GrantMode } from 'clearchat-frontend/services/backend';
import { inject as service } from '@ember/service';

interface AdminManageRoomArgs {
    room: Room;
}
const MAX_LENGTH = 10000;

export default class AdminManageRoom extends Component<AdminManageRoomArgs> {
    @service backend!: Backend;

    @tracked
    showManageRoomModal = false;

    @tracked
    showConfirmModal = false;

    @tracked
    showPleaseWaitModal = false;

    @tracked
    confirming: 'RESET' | 'DELETE' | undefined;

    @tracked
    grantMode: GrantMode = 'LINK';

    @tracked
    grantTextLink = '';

    @tracked
    grantTextText = '';

    @tracked
    grantTextIsValid = false;

    get grantText(): string {
        return this.grantMode === 'LINK' ? this.grantTextLink : this.grantTextText;
    }

    set grantText(text: string) {
        if (this.grantMode === 'LINK') {
            this.grantTextLink = text.substr(0, MAX_LENGTH);
        } else {
            this.grantTextText = text.substr(0, MAX_LENGTH);
        }
        this.validateGrantText();
    }

    @action
    didInsert(): void {
        this.grantMode = this.args.room.grant.mode;
        this.grantText = this.args.room.grant.text;
    }

    @action
    manageRoom(): void {
        this.showManageRoomModal = true;
    }

    @action
    saveChanges(): void {
        this.showManageRoomModal = false;
        this.backend.setRoomGrant(
            {
                mode: this.grantMode,
                text: this.grantText,
            },
        );
    }

    @action
    cancel(): void {
        this.grantMode = this.args.room.grant.mode;
        this.grantText = this.args.room.grant.text;
        this.showManageRoomModal = false;
        this.showConfirmModal = false;
    }

    @action
    clearRoom(): void {
        this.confirming = 'RESET';
        this.showManageRoomModal = false;
        this.showConfirmModal = true;
    }

    @action
    deleteRoom(): void {
        this.confirming = 'DELETE';
        this.showManageRoomModal = false;
        this.showConfirmModal = true;
    }

    @action
    confirm(): void {
        if (this.confirming === 'DELETE') {
            this.backend.deleteRoom();
        } else {
            this.backend.resetRoom();
        }
        this.confirming = undefined;
        this.showConfirmModal = false;
        this.showPleaseWaitModal = true;
    }

    @action
    editGrantMode(mode: GrantMode): void {
        this.grantMode = mode;
        this.validateGrantText();
    }

    validateGrantText(): void {
        if (this.grantMode === 'LINK') {
            this.grantTextIsValid = /^(?:http(s)?:\/\/)+[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/.test(this.grantText);
        } else {
            this.grantTextIsValid = this.grantText.length > 0;
        }
    }
}
