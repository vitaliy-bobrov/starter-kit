(navigator => {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.info('Service Worker successfuly installed!');

        reg.onupdatefound = () => {
          let installingWorker = reg.installing;

          installingWorker.onstatechange = () => {
            switch (installingWorker.state) {
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  console.info('New or updated content is available.');
                } else {
                  console.info('Content is now available offline!');
                }
                break;

              case 'redundant':
                console.error('Installing service worker became redundant.');

                break;
            }
          };
        };
      })
      .catch(err => console.error('Service worker registration:', err));
  }
})(navigator);
