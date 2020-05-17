import Component from '@glimmer/component';

import { action } from '@ember/object';

function shuffleArray<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

interface PageHomeServicesArgs { }

export default class PageHomeServices extends Component<PageHomeServicesArgs> {

    @action
    inserted() {
        // https://css-tricks.com/snippets/css/typewriter-effect/
        // array with texts to type in typewriter
        const publicServices = ['Jitsi', 'Google Meet', 'Whereby', 'Hangouts', 'Zoom'];
        shuffleArray(publicServices);
        const services = [...publicServices, 'Your Video Chat', 'Your Chat App', 'Anything!'];

        // type one text in the typewriter
        // keeps calling itself until the text is finished
        function typeWriter(text: string, i: number, fnCallback: Function | undefined) {
            // check if text isn't finished yet
            if (i < (text.length)) {
                const typeWriterElement = document.querySelector('#type-writer');
                if (typeWriterElement) {
                    typeWriterElement.innerHTML = text.substring(0, i + 1) + '<span aria-hidden="true"></span>';

                    // wait for a while and call this function again for next character
                    setTimeout(function () {
                        typeWriter(text, i + 1, fnCallback)
                    }, 100);
                }
            }
            // text finished, call callback if there is a callback function
            else if (typeof fnCallback == 'function') {
                // call callback after timeout
                setTimeout(fnCallback, 700);
            }
        }
        // start a typewriter animation for a text in the dataText array
        function StartTextAnimation(i: number) {
            if (typeof services[i] == 'undefined') {
                setTimeout(function () {
                    StartTextAnimation(0);
                }, 1);
            } else {
                // check if dataText[i] exists
                if (i < services[i].length) {
                    // text exists! start typewriter animation
                    typeWriter(services[i], 0, function () {
                        // after callback (and whole text has been animated), start next text
                        StartTextAnimation(i + 1);
                    });
                }
            }
        }
        // start the text animation
        StartTextAnimation(0);
    };



}
