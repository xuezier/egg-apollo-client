'use strict';
const curl = require('../../../../../../lib/curl').default;

module.exports = app => {
  return class HomeController extends app.Controller {
    * index() {
      const { ctx } = this;
      ctx.body = 'Hello Apollo';
    }

    * curlTest() {
        const res = curl({
            url: 'https://www.baidu.com'
        });
        this.ctx.body = res.status;
    }
  };
};
