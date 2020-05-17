import Component from '@glimmer/component';
import { Guest } from 'clearchat-frontend/services/backend';

interface UserGrantedTextArgs {
    guest: Guest;
}

export default class UserGrantedText extends Component<UserGrantedTextArgs> { }
