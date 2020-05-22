import Component from '@glimmer/component';
import { Guest } from 'clearchat-frontend/models/guest';

interface UserGrantedTextArgs {
    guest: Guest;
}

export default class UserGrantedText extends Component<UserGrantedTextArgs> { }
