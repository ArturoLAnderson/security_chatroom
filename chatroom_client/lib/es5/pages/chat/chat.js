'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Chat 聊天页面
 */

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('common.ui-components/chat-panel'),
    ChatPanel = _require2.ChatPanel;

var defaultPlugins = require('common.ui-components/editor/plugins');
var customPlugins = require('./editor-plugins');

var _require3 = require('./chat-controller'),
    sendMessage = _require3.sendMessage;

var _require4 = require('../data-panel/data-panel'),
    DataPanelPage = _require4.DataPanelPage;

var _require5 = require('../../store'),
    store = _require5.store;

/**
 * @class
 *
 * 聊天页面
 */


var ChatPage = function (_BaseComponent) {
  _inherits(ChatPage, _BaseComponent);

  function ChatPage(config) {
    _classCallCheck(this, ChatPage);

    // 存储图片信息
    var _this = _possibleConstructorReturn(this, (ChatPage.__proto__ || Object.getPrototypeOf(ChatPage)).call(this, config));

    _this.imgInfoList = [];
    return _this;
  }

  /**
   * 添加用于展示图片的信息
   * @param {Object} imgInfo
   */


  _createClass(ChatPage, [{
    key: 'addImgInfo',
    value: function addImgInfo(imgInfo) {
      var modal = store.imagePreviewModal;

      this.imgInfoList.push(imgInfo);

      if (modal) {
        modal.refreshBtns();
        modal.refreshTitle();
      }
    }

    /**
     * 更新聊天室标题
     * @param {*} title
     */

  }, {
    key: 'updateTitle',
    value: function updateTitle(title) {
      this.$elem.find('.uic-header').find('.toolbar-title').text(title);
    }
  }, {
    key: 'create',
    value: function create() {
      var chatPage = this;
      var config = chatPage.config;
      var $elem = chatPage.createRootElem('\n      <div data-uic-page="chat_home" class="uic-page chat-home-page">\n        <div class="uic-header">\n          <div class="uic-toolbar">\n            <div class="toolbar-container">\n              <a href="javascript:;" class="toolbar-button"></a>\n              <a href="javascript:;" class="toolbar-button" data-control="data-list">\n                <i class="iconfont icon-uic-folder"></i>\n              </a>\n            </div>\n            <div class="uic-title">\n              <div class="toolbar-title">\n                ' + config.title + '\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class="uic-content"></div>\n      </div>\n    ');

      // 绑定“打开列表页面按钮”点击事件
      $elem.find('[data-control="data-list"]').on('click', function () {
        var dataListPage = store.nav.getPage('data-list-page');

        // 如果是第一次打开就先创建文件列表页面
        if (!dataListPage) {
          dataListPage = new DataPanelPage({ title: 'Data List' });
          store.nav.push('data-list-page', dataListPage);
        }

        dataListPage.getActivedDataList().reloadIfHasLastID();

        store.nav.navTo('data-list-page');
      });

      // 聊天面板配置
      var chatConfig = {
        chatPage: chatPage,
        // 聊天面板组件中的编辑器配置
        editorConfig: {
          // 文件上传大小限制为 10 M
          fileSizeLimit: 10 * 1024 * 1024,
          fileSizeTip: 'File too large, maximum file size for uploads is 10MB',
          // 设置工具栏按钮顺序
          menu: ['file', 'image', 'face', 'article'],
          // 加载自定义插件
          plugins: [defaultPlugins.plugin_uploadFile, defaultPlugins.plugin_sendEmoji, defaultPlugins.plugin_parseEvent, customPlugins.plugin_showEditArticlePage, customPlugins.plugin_textareaEvents]
        }
      };

      // 创建聊天面板组件
      var chatPanel = new ChatPanel(chatConfig);
      // 添加到页面
      chatPanel.render($elem.find('.uic-content'));

      this.chatPanel = chatPanel;
      this.editor = chatPanel.editor;
    }
  }, {
    key: 'onCreated',
    value: function onCreated() {
      var eventName = this.chatPanel.constants.EVENT_ERROY_BTN_CLICK;
      var chatPanel = this.chatPanel;

      // 监听消息错误状态按钮被点击事件
      chatPanel.on(eventName, function (_, e, msg) {
        if (msg.item.config.pos === 'right') {
          sendMessage(msg.item);
        }
      });
    }
  }]);

  return ChatPage;
}(BaseComponent);

exports.ChatPage = ChatPage;