/* eslint-env worker */
(function(global) {
  'use strict';

  global.toolbox.router.get('/(.*)', global.toolbox.fastest);
})(self);
