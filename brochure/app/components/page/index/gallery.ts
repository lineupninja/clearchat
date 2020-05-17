import Component from '@glimmer/component';

interface PageIndexGalleryArgs { }

export default class PageIndexGallery extends Component<PageIndexGalleryArgs> {

    items = [
        {
            src: '/images/guest-initial.png',
            w: 553,
            h: 352,
            title: 'A new guest arriving at your room',
            index: 0,
        },
        {
            src: '/images/guest-pending.png',
            w: 608,
            h: 549,
            title: 'Chatting with a guest to qualify them',
            index: 1,
        },
        {
            src: '/images/guest-granted.png',
            w: 461,
            h: 258,
            title: 'A guest that has been granted permission',
            index: 2,
        },
        {
            src: '/images/admin-ui.png',
            w: 1539,
            h: 1190,
            title: 'The ClearChat admin interface',
            index: 3,
        },
    ]

    get firstRow() {
        return [this.items[0], this.items[1]];
    }
    get secondRow() {
        return [this.items[2], this.items[3]];
    }
    get rows() {
        return [this.firstRow, this.secondRow];
    }

}
