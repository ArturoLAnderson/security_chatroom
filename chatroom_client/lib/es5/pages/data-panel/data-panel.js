'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('common.ui-components/tab/utils'),
    bindTabEvent = _require2.bindTabEvent;

var _require3 = require('./data-list'),
    DataList = _require3.DataList;

var _require4 = require('../../store'),
    store = _require4.store;

/**
 * @class
 *
 * 数据面板页面
 */


var DataPanelPage = function (_BaseComponent) {
  _inherits(DataPanelPage, _BaseComponent);

  function DataPanelPage(config) {
    _classCallCheck(this, DataPanelPage);

    // 列表字典
    var _this2 = _possibleConstructorReturn(this, (DataPanelPage.__proto__ || Object.getPrototypeOf(DataPanelPage)).call(this, config));

    _this2.listMap = {};
    return _this2;
  }

  _createClass(DataPanelPage, [{
    key: 'create',
    value: function create() {
      var _this = this;
      var $elem = this.createRootElem('\n      <div data-uic-page="data-panel" class="uic-page data-panel-page">\n        <div class="uic-header">\n          <div class="uic-toolbar">\n            <div class="toolbar-container">\n              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>\n              <a href="javascript:;" class="toolbar-button"></a>\n            </div>\n            <div class="uic-title">\n              <div class="toolbar-title">\n                ' + this.config.title + '\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class="uic-content">\n          <div class="uic-tabs">\n            <div class="uic-tabbar">\n              <a href="javascript:;" data-tab-type="article" data-target-tab="tab-article" class="tab-link">Article</a>\n              <a href="javascript:;" data-tab-type="image" data-target-tab="tab-image" class="tab-link tab-link-active">Image</a>\n              <a href="javascript:;" data-tab-type="file" data-target-tab="tab-file" class="tab-link">File</a>\n            </div>\n            <div class="uic-tab-panel">\n              <div data-tab-name="tab-article" class="uic-tab uic-hide"></div>\n              <div data-tab-name="tab-image" class="data-list__tab-image uic-tab uic-active"></div>\n              <div data-tab-name="tab-file" class="uic-tab uic-hide"></div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ');

      // 为 tablink 按钮绑定点击事件
      bindTabEvent($elem);

      $elem.find('[data-control="back"]').on('click', function () {
        store.nav.back();
      });

      // 绑定 tab 栏按钮点击事件，被点击时获取最新列表数据
      $elem.find('.uic-tabbar').find('.tab-link').on('click', function () {
        // 获取列表类型
        var listType = $(this).data('tabType');
        // 重置列表并加载列表第一页数据
        _this.listMap[listType].reloadIfHasLastID();
      });

      // 创建数据列表
      _this.listMap['article'] = new DataList({ type: 'article' }).render($elem.find('[data-tab-name="tab-article"]'));

      _this.listMap['image'] = new DataList({ type: 'image' }).render($elem.find('[data-tab-name="tab-image"]'));

      _this.listMap['file'] = new DataList({ type: 'file' }).render($elem.find('[data-tab-name="tab-file"]'));
    }

    /**
     * 获取当前处于可视状态的列表组件
     */

  }, {
    key: 'getActivedDataList',
    value: function getActivedDataList() {
      // 获取列表类型
      var listType = this.$elem.find('.uic-tabbar').find('.tab-link-active').data('tabType');

      return this.listMap[listType];
    }
  }]);

  return DataPanelPage;
}(BaseComponent);

exports.DataPanelPage = DataPanelPage;