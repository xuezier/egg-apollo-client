'use strict';

module.exports = app => {
  return class HomeController extends app.Controller {
    * index() {
      const { ctx } = this;
      ctx.body = 'Hello Apollo';
    }
  };
};
