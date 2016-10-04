(document => {
  'use strict';

  /**
   * Test webP images support.
   * @param {function} callback - Callback function.
   */
  function testWepP(callback) {
    let webP = new Image();
    webP.src = 'data:image/webp;base64,UklGRi4AAABXRUJQVlA4TCEAAAAvAUAAEB8wA' +
    'iMwAgSSNtse/cXjxyCCmrYNWPwmHRH9jwMA';

    webP.onload = webP.onerror = () => {
      callback(webP.height === 2);
    };
  }

  testWepP(supported => {
    if (supported) {
      document.body.classList.add('webp');
    }
  });
})(document);
