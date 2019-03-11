/**
 * editor plugin 文件上传
 */
const Hammer = require('hammerjs');

const { EditorPlugin } = require('common.ui-components/editor');
const { fileToMessagePayload } = require('common.utils/file');

const { store } = require('src/store');
const { cacheMessageData } = require('src/utils');
const { addOfflinePanel } = require('./utils/check-offline');
const { EditArticlePage } = require('src/pages/article/edit-article');
const { sendMessage } = require('./chat-controller');

const msgConfigs = require('./message-configs');

createPlugin_bindTextareaEvents();
createPlugin_showEditArticlePage();

/**
 * 新建“展示文章编辑页面”插件
 *
 * 编辑器添加按钮，点击按钮时页面跳转到文章编辑页面
 */
function createPlugin_showEditArticlePage() {
  // 编辑文章页面跳转按钮插件
  const plugin_showEditArticlePage = new EditorPlugin();
  const config_showEditArticlePage = {
    name: 'editor-tool-show-edit-article-page',
    alias: 'article',
    innerHtml: '<i class="iconfont icon-uic-article"></i>'
  };

  config_showEditArticlePage.onCreated = __onToolbarItemCreated;
  plugin_showEditArticlePage.toolbarItemConfigs = [config_showEditArticlePage];

  exports.plugin_showEditArticlePage = plugin_showEditArticlePage;

  /**
   * 编辑器的工具栏按钮组件 onCreated 回调
   * @param {Editor}} editor
   * @param {Editor_ToolbarItem} item
   */
  function __onToolbarItemCreated(editor, item) {
    const $elem = item.$elem;
    // 创建文章编辑页面
    const page = new EditArticlePage({ title: 'New Article' });
    // 添加到导航组件
    store.nav.push('edit_article_page', page);
    // 绑定发布文章事件
    page.on(page.constants.EVENT_PUBLISH, (_, e, message) => {
      const chatPanel = editor.config.chatPanel;

      _sendMessage(message, chatPanel, 'right');
      store.nav.navTo('chat_page');
    });
    // 绑定跳转按钮点击事件
    $elem.on('click', function() {
      store.nav.navTo('edit_article_page');
    });
  }
}

/**
 * 新建“绑定编辑器文本域事件”插件
 *
 * 编辑器添加按钮，点击按钮时页面跳转到文章编辑页面
 */
function createPlugin_bindTextareaEvents() {
  // 编辑器事件处理插件
  const plugin_textareaEvents = new EditorPlugin();

  /**
   * 编辑器的工具栏按钮组件 onCreated 回调
   * @param {Editor} editor
   */
  plugin_textareaEvents.onCreated = editor => {
    const chatPanel = editor.config.chatPanel;
    editor.chatPanel = chatPanel;

    addOfflinePanel(editor);
    __addSendButton();
    __addEditorTip();
    __bindEvent_dragEditorToolBar();
    __bindEvent_onTextareaEnter();
    __bindEvent_uploadFile();
    __bindEvent_parseToTextarea();
    __bindEvent_dropImageToTextarea();

    /**
     * 为编辑器添加发送按钮
     */
    function __addSendButton() {
      const $sendBtn = $('<a href="javascript:;" class="btn--send">Send</a>');
      editor.$elem.append($sendBtn);

      $sendBtn.on('click', function() {
        let keyDownEvent = $.Event('keydown');
        keyDownEvent.which = 13;
        editor.textarea.$elem.trigger(keyDownEvent);
      });
    }

    /**
     * 为文本域绑定图片拖拽事件
     */
    function __bindEvent_dropImageToTextarea() {
      editor.textarea.$elem.on('drop', function(event) {
        const dataTransfer = event.originalEvent.dataTransfer;

        // 如果拖拽进文本域的内容中包含图片的 HTML，就提取图片链接到文本域中
        if (
          dataTransfer.types.includes('text/html') &&
          /\<img .*?\/?\>/.test(dataTransfer.getData('text/html'))
        ) {
          editor.insertHtml(dataTransfer.getData('text'));

          // 阻断默认事件
          return false;
        }
      });
    }

    /**
     * 为编辑器添加提示组件
     */
    function __addEditorTip() {
      const $editorTip = $(`
        <div class="talk__tip uic-hide">
          <a class="talk__tip__item talk__tip--new-message">
            新消息
          </a>
        </div>
      `);

      editor.nodes.$editorTip = $editorTip;
      editor.$elem.append($editorTip);

      // 绑定组件被点击事件
      // 被点击时将消息面板滚动条滚动到底部
      $editorTip.on('click', function() {
        $editorTip.addClass('uic-hide');
        chatPanel.scrollToBottom();
      });

      const chatPanel = editor.chatPanel;
      const $messagePanel = chatPanel.nodes.$messagePanel;
      const $messageInner = $messagePanel.children('.inner');

      // 绑定消息面板滚动条事件
      // 当滚动到底部时，隐藏“提示组件”
      $messagePanel.scroll(function() {
        if (
          $messagePanel.height() + $messagePanel.scrollTop() + 40 >
          $messageInner.height()
        ) {
          $editorTip.addClass('uic-hide');
        }
      });
    }

    /**
     * 绑定 Editor Toolbar 拖拽事件
     *
     * 拖拽工具栏改变 Editor 高度
     * @param {Editor_Toolbar} $toolbar
     */
    function __bindEvent_dragEditorToolBar() {
      const $toolbar = editor.toolbar.$elem;
      const $textarea = editor.textarea.$elem;
      const localStore = store.localStore;
      const mc = new Hammer($toolbar.get(0));

      let confHeight = localStore.get('editor:height') || $textarea.height();

      $toolbar.css('cursor', 'row-resize');

      $textarea.height(confHeight);

      mc.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });

      mc.on('pan', function(ev) {
        let origHeight = $textarea.data('origHeight');

        if (!origHeight) {
          origHeight = $textarea.height();
          $textarea.data('origHeight', origHeight);
        }

        let height = origHeight - ev.deltaY;

        if (height < 60) {
          height = 60;
        }

        $textarea.height(height);

        if (ev.isFinal) {
          $textarea.data('origHeight', height);
          localStore.set('editor:height', height);
        }
      });
    }

    /**
     * 绑定文本域 onEnter 事件
     * @param {Editor} editor
     */
    function __bindEvent_onTextareaEnter() {
      const $textarea = editor.textarea.$elem;

      // 为文本域绑定 onKeyDown 事件
      $textarea.on('keydown', function(event) {
        const KEY_ENTER = 13;

        // 拦截“回车”事件
        if (event.which === KEY_ENTER) {
          const text = editor.getText();
          const $imgs = editor.getImages();

          // 发送文字
          if (text !== '') {
            _sendMessage(
              {
                type: 'text',
                info: {
                  text: text
                }
              },
              chatPanel,
              'right'
            );
          }

          // 发送图片
          if ($imgs.length > 0) {
            const cacheMap = editor.cache.fileMessageMap;

            for (let img of $imgs) {
              const message = cacheMap[$(img).data('md5')];
              _sendMessage(message, chatPanel, 'right');
            }
          }

          // 清空编辑器
          $textarea.empty();
          editor.cache.fileMessageMap = {};

          return false;
        }
      });

      // 如果是移动端
      // 当文本域获取到焦点时输入法被弹出，缩小消息列表到手机显示区域
      // 当文本域失去焦点时，还原消息列表到原始大小
      if (store.isMobile) {
        // 文本域获得焦点事件
        $textarea.on('focus', function() {
          setTimeout(() => {
            // 输入法弹出时，body 的 scrollTop 即输入法在屏幕中占据的高度
            chatPanel.nodes.$messagePanel.css(
              'padding-top',
              $('body').scrollTop() - 20 + 'px'
            );
            setTimeout(() => {
              // 将消息列表滚动到底部
              chatPanel.scrollToBottom();
            }, 300);
          }, 300);
        });

        // 文本域失去焦点事件
        $textarea.on('blur', function() {
          setTimeout(() => {
            chatPanel.nodes.$messagePanel.css('padding-top', '20px');
          }, 300);
        });
      }
    }

    /**
     * 绑定文件上传事件
     */
    function __bindEvent_uploadFile() {
      editor.on(editor.constants.EVENT_UPLOAD_FILE, function(_, event, file) {
        fileToMessagePayload(file).then(message => {
          _sendMessage(message, chatPanel, 'right');
        });
      });
    }

    /**
     * 绑定文本域粘贴事件
     */
    function __bindEvent_parseToTextarea() {
      editor.on(editor.constants.EVENT_PARSE, function(editor, event, msg) {
        if (msg.type === 'text') {
          editor.insertHtml(msg.data);
        } else if (msg.type === 'image') {
          const file = msg.data;

          (async () => {
            const blobURL = URL.createObjectURL(file);
            const message = await fileToMessagePayload(file);

            // 缓存 message payload
            editor.cache.fileMessageMap[message.md5sum] = message;
            // 将图片插入编辑器
            editor.insertHtml(`
            <img
              data-md5="${message.md5sum}"
              src="${blobURL}"
            >
          `);
          })();
        }
      });
    }
  };

  // 导出插件
  exports.plugin_textareaEvents = plugin_textareaEvents;
}

/**
 * 发送消息
 * @param {Object} message 消息体
 */
function _sendMessage(message, chatPanel, pos = 'left') {
  const itemConfig = msgConfigs.getMessageItemConfig({
    pos: pos,
    user: store.user,
    message: message,
    timestamp: new Date().valueOf()
  });

  // 如果是图片消息就生成图片预览信息
  if (message.type === 'image') {
    const msgInfo = message.info;
    const imgInfo = {
      dataID: msgInfo.dataID,
      md5sum: msgInfo.md5sum,
      preview: null,
      payloadLength: msgInfo.len,
      imgSrc: msgInfo.dataUrl
    };

    itemConfig.imgInfo = imgInfo;
    // 添加消息创建完成回调函数
    itemConfig.onCreated.push(item => {
      // 添加图片预览回调函数
      imgInfo.onPreview = imgSrc => {
        // 图片开始预览时触发消息点击事件，执行图片下载任务
        item.$elem.find('.item-message--image').trigger('click');
      };
    });

    const chatPage = store.nav.getPage('chat_page');
    chatPage.addImgInfo(imgInfo);
  }

  // 添加消息创建完成回调函数
  itemConfig.onCreated.push(item => {
    // 如果不是文本消息就缓存消息的 dataURL
    if (message.type != 'text') {
      cacheMessageData(message.info.md5sum, message.info.dataUrl);
    }
    // 发送消息给灯塔
    sendMessage(item);
  });

  chatPanel.addMessages([itemConfig]).scrollToBottom();
}
