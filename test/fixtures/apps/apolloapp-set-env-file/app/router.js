'use strict';

module.exports = function(app) {
  app.get('/', 'home.index');
  app.get('/curlTest', 'home.curlTest');
};
