/**
 *  watch.config.js
 *
 *  重写 @ionic config watch.config.js
 *  支持 .js 后缀文件修改过后自动更新到浏览器
 */

var watch = require('@ionic/app-scripts/dist/watch');
var copy = require('@ionic/app-scripts/dist/copy');
var copyConfig = require('@ionic/app-scripts/config/copy.config');

module.exports = {
  srcFiles: {
    paths: ['{{SRC}}/**/*.(ts|js|html|s(c|a)ss)', '../common'],
    options: {
      ignored: [
        '{{SRC}}/**/*.spec.ts',
        '{{SRC}}/**/*.e2e.ts',
        '**/*.DS_Store',
        '{{SRC}}/index.html'
      ]
    },
    callback: watch.buildUpdate
  },
  copyConfig: copy.copyConfigToWatchConfig()
};
