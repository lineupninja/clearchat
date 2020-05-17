import Component from '@glimmer/component';
import { Guest } from 'clearchat-frontend/services/backend';

interface UserGrantedLinkArgs {
    guest: Guest;
}

export default class UserGrantedLink extends Component<UserGrantedLinkArgs> { }
