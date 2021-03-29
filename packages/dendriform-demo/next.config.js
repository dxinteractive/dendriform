// next.config.js
// const withTM = require('@weco/next-plugin-transpile-modules');

var path = require('path');

module.exports = {
    webpack: function (config) {
        // config.resolve.alias['immer'] = path.resolve('../dendriform/node_modules/immer');
        return config;
    }
};
