const Apollo = require('../../../../../app/lib/apollo').default;

/**
 * @param {Apollo} apollo
 */
module.exports = apollo => {
    return {
        NODE_ENV: apollo.get('NODE_ENV')
    };
}