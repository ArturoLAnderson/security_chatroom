'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * 文章浏览页面
 */
var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('common.utils'),
    base64 = _require2.base64;

var _require3 = require('../../utils'),
    bindNavBackEvent = _require3.bindNavBackEvent;

var ArticlePage = exports.ArticlePage = function (_BaseComponent) {
  _inherits(ArticlePage, _BaseComponent);

  function ArticlePage(config) {
    _classCallCheck(this, ArticlePage);

    return _possibleConstructorReturn(this, (ArticlePage.__proto__ || Object.getPrototypeOf(ArticlePage)).call(this, config));
  }

  _createClass(ArticlePage, [{
    key: 'create',
    value: function create() {
      var $elem = this.createRootElem('<div data-uic-page="read_article" class="uic-page read-article-page">\n        <div class="uic-header">\n          <div class="uic-toolbar">\n            <div class="toolbar-container">\n              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>\n              <a href="javascript:;" class="toolbar-button"></a>\n            </div>\n            <div class="uic-title">\n              <div class="toolbar-title">\n                Article\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class="uic-content">\n          <div class="inner"></div>\n        </div>\n      </div>');

      var info = this.config.info;
      var $content = $elem.find('.uic-content').find('.inner');
      var articleData = JSON.parse(base64.decode(info.dataUrl));

      // 渲染标题
      $content.append('<h1 class="title">' + articleData.title + '</h1>');
      // 渲染正文
      $content.append('<div class="content">' + articleData.content + '</div>');

      // 绑定后退按钮事件
      bindNavBackEvent($elem);
    }
  }]);

  return ArticlePage;
}(BaseComponent);