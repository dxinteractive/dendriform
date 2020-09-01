// next.config.js
// const withTM = require('@weco/next-plugin-transpile-modules');

var path = require('path');

module.exports = {
    basePath: '/dendriform',
    webpack: function (config) {
        config.resolve.alias['react'] = path.resolve('./node_modules/react');
        config.resolve.alias['react-dom'] = path.resolve('./node_modules/react-dom');
        config.resolve.alias['mobx'] = path.resolve('./node_modules/mobx');
        config.resolve.alias['mobx-utils'] = path.resolve('./node_modules/mobx-utils');
        return config;
    }
};
