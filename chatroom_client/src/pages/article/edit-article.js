/**
 * 文章编辑页面
 */

require('common.ui-components/editor/editor.css');

const md5 = require('blueimp-md5');

const { base64, sizeof } = require('common.utils');
const { getFileDataURL } = require('common.utils/file');
const { BaseComponent } = require('common.ui-components/base');
const { Editor } = require('common.ui-components/editor');
const plugins = require('common.ui-components/editor/plugins');

const { bindNavBackEvent } = require('src/utils');

/**
 * @class
 *
 * 文章编辑页面
 */
export class EditArticlePage extends BaseComponent {
  constructor(config) {
    super(config);
    this.editor = null;
    this.itemMap = {};
  }

  beforeCreate() {
    this.constants.EVENT_PUBLISH = 'EDIT_ARTICLE:EVNET_PUBLISH';
  }

  create() {
    const config = this.config;
    const $page = this.createRootElem(`
      <div data-uic-page="edit_article" class="uic-page edit-article-page">
        <div class="uic-header">
          <div class="uic-toolbar">
            <div class="toolbar-container">
              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>
              <a href="javascript:;" class="toolbar-button" data-control="publish">Publish</a>
            </div>
            <div class="uic-title">
              <div class="toolbar-title">
                ${config.title}
              </div>
            </div>
          </div>
        </div>
        <div class="uic-content">
          <div>
            <input type="text" class="title" placeholder="title" />
          </div>
          <div class="editor-wrapper"></div>
        </div>
      </div>
    `);

    const _this = this;

    this.nodes.$title = $page.find('input.title');

    bindNavBackEvent($page);

    // 绑定发布按钮被点击事件
    $page.find('[data-control="publish"]').on('click', function() {
      _this.publish();
    });

    // 编辑器配置项
    const editorConfig = {
      // 限制文件上传大小为 10 M
      fileSizeLimit: 10 * 1024 * 1024,
      fileSizeTip: 'File too large, maximum file size for uploads is 10MB',
      // 设置工具栏图标顺序
      menu: ['image', 'face', 'head', 'bold', 'italic', 'underline', 'strike'],
      // 加载自定义插件
      plugins: [
        plugins.plugin_uploadFile,
        plugins.plugin_sendEmoji,
        plugins.plugin_textFormat,
        plugins.plugin_parseEvent
      ]
    };
    const editor = new Editor(editorConfig);

    editor
      // 渲染编辑器组件
      .render($page.find('.editor-wrapper'))
      // 监听文件上传事件
      .on(editor.constants.EVENT_UPLOAD_FILE, function(editor, event, file) {
        (async () => {
          const dataUrl = await getFileDataURL(file);

          editor.insertHtml(`<img src="${dataUrl}" />`);
        })();
      })
      // 监听粘贴事件
      .on(editor.constants.EVENT_PARSE, function(editor, event, msg) {
        if (msg.type === 'text') {
          // 粘贴文本

          let pasteHtml = msg.html;
          // 过滤无用标签
          pasteHtml = pasteHtml.replace(/<(meta|script|link).+?>/gim, '');
          // 去掉注释
          pasteHtml = pasteHtml.replace(/<!--.*?-->/gm, '');
          // 过滤 data-xxx 属性
          pasteHtml = pasteHtml.replace(/\s?data-.+?=('|").+?('|")/gim, '');

          editor.insertHtml(pasteHtml);
        } else if (msg.type === 'image') {
          // 粘贴图片

          const file = msg.data;

          (async () => {
            // 获取文件的 dataURL
            const dataUrl = await getFileDataURL(file);
            // 将图片插入编辑器
            editor.insertHtml(`<img src="${dataUrl}">`);
          })();
        }
      });

    this.editor = editor;
  }

  /**
   * 发表文章
   *
   * @event EVENT_PUBLISH 触发当前组件的发布事件
   */
  publish() {
    const title = $.trim(this.nodes.$title.val());
    const text = this.editor.getText() + '...';
    const html = this.editor.getHtml();
    const images = this.editor.getImages();
    let description;

    // 截取文章描述信息
    if (text.length < 200) {
      description = text;
    } else {
      description = text.substring(0, 200) + '...';
    }

    // 正文不允许为空
    if (title.length === 0 || (text.length === 0 && images.length === 0)) {
      alert('The title or text can not be blank.');
      return;
    }

    const articleDataStr = JSON.stringify({
      title: title,
      content: html
    });

    // 计算正文字节数
    const htmlSize = sizeof(articleDataStr);
    // 生成正文 base64 字符串
    const base64Content = base64.encode(articleDataStr);

    // 生成文章消息
    const data = {
      type: 'article',
      info: {
        name: title,
        ext: 'article',
        size: htmlSize,
        len: base64Content.length,
        dataUrl: base64Content,
        md5sum: md5(base64Content),
        thumbnail: base64.encode(
          JSON.stringify({
            name: title,
            description: description,
            ext: 'article',
            size: htmlSize,
            len: base64Content.length,
            firstImage: null
          })
        )
      }
    };

    // 触发发表文章事件
    this.$elem.trigger(this.constants.EVENT_PUBLISH, data);

    // 初始化表单
    this.nodes.$title.val('');
    this.editor.empty();
  }
}
