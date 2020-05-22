import Component from '@glimmer/component';
import { Guest } from 'clearchat-frontend/models/guest';

interface UserGrantedArgs {
    guest: Guest;
}

export default class UserGranted extends Component<UserGrantedArgs> { }
