import Component from '@glimmer/component';
import { Guest } from 'clearchat-frontend/models/guest';

interface UserGrantedLinkArgs {
    guest: Guest;
}

export default class UserGrantedLink extends Component<UserGrantedLinkArgs> { }
