/**
 * Chat 聊天页面
 */

const { BaseComponent } = require('common.ui-components/base');
const { ChatPanel } = require('common.ui-components/chat-panel');
const defaultPlugins = require('common.ui-components/editor/plugins');
const customPlugins = require('./editor-plugins');
const { sendMessage } = require('./chat-controller');
const { DataPanelPage } = require('../data-panel/data-panel');

const { store } = require('src/store');

/**
 * @class
 *
 * 聊天页面
 */
class ChatPage extends BaseComponent {
  constructor(config) {
    super(config);

    // 存储图片信息
    this.imgInfoList = [];
  }

  /**
   * 添加用于展示图片的信息
   * @param {Object} imgInfo
   */
  addImgInfo(imgInfo) {
    const modal = store.imagePreviewModal;

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
  updateTitle(title) {
    this.$elem
      .find('.uic-header')
      .find('.toolbar-title')
      .text(title);
  }

  create() {
    const chatPage = this;
    const config = chatPage.config;
    const $elem = chatPage.createRootElem(`
      <div data-uic-page="chat_home" class="uic-page chat-home-page">
        <div class="uic-header">
          <div class="uic-toolbar">
            <div class="toolbar-container">
              <a href="javascript:;" class="toolbar-button"></a>
              <a href="javascript:;" class="toolbar-button" data-control="data-list">
                <i class="iconfont icon-uic-folder"></i>
              </a>
            </div>
            <div class="uic-title">
              <div class="toolbar-title">
                ${config.title}
              </div>
            </div>
          </div>
        </div>

        <div class="uic-content"></div>
      </div>
    `);

    // 绑定“打开列表页面按钮”点击事件
    $elem.find('[data-control="data-list"]').on('click', function() {
      let dataListPage = store.nav.getPage('data-list-page');

      // 如果是第一次打开就先创建文件列表页面
      if (!dataListPage) {
        dataListPage = new DataPanelPage({ title: 'Data List' });
        store.nav.push('data-list-page', dataListPage);
      }

      dataListPage.getActivedDataList().reloadIfHasLastID();

      store.nav.navTo('data-list-page');
    });

    // 聊天面板配置
    const chatConfig = {
      chatPage: chatPage,
      // 聊天面板组件中的编辑器配置
      editorConfig: {
        // 文件上传大小限制为 10 M
        fileSizeLimit: 10 * 1024 * 1024,
        fileSizeTip: 'File too large, maximum file size for uploads is 10MB',
        // 设置工具栏按钮顺序
        menu: ['file', 'image', 'face', 'article'],
        // 加载自定义插件
        plugins: [
          defaultPlugins.plugin_uploadFile,
          defaultPlugins.plugin_sendEmoji,
          defaultPlugins.plugin_parseEvent,
          customPlugins.plugin_showEditArticlePage,
          customPlugins.plugin_textareaEvents
        ]
      }
    };

    // 创建聊天面板组件
    const chatPanel = new ChatPanel(chatConfig);
    // 添加到页面
    chatPanel.render($elem.find('.uic-content'));

    this.chatPanel = chatPanel;
    this.editor = chatPanel.editor;
  }

  onCreated() {
    const eventName = this.chatPanel.constants.EVENT_ERROY_BTN_CLICK;
    const chatPanel = this.chatPanel;

    // 监听消息错误状态按钮被点击事件
    chatPanel.on(eventName, function(_, e, msg) {
      if (msg.item.config.pos === 'right') {
        sendMessage(msg.item);
      }
    });
  }
}

exports.ChatPage = ChatPage;
