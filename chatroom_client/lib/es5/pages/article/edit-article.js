'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * 文章编辑页面
 */

require('common.ui-components/editor/editor.css');

var md5 = require('blueimp-md5');

var _require = require('common.utils'),
    base64 = _require.base64,
    sizeof = _require.sizeof;

var _require2 = require('common.utils/file'),
    getFileDataURL = _require2.getFileDataURL;

var _require3 = require('common.ui-components/base'),
    BaseComponent = _require3.BaseComponent;

var _require4 = require('common.ui-components/editor'),
    Editor = _require4.Editor;

var plugins = require('common.ui-components/editor/plugins');

var _require5 = require('../../utils'),
    bindNavBackEvent = _require5.bindNavBackEvent;

/**
 * @class
 *
 * 文章编辑页面
 */


var EditArticlePage = exports.EditArticlePage = function (_BaseComponent) {
  _inherits(EditArticlePage, _BaseComponent);

  function EditArticlePage(config) {
    _classCallCheck(this, EditArticlePage);

    var _this2 = _possibleConstructorReturn(this, (EditArticlePage.__proto__ || Object.getPrototypeOf(EditArticlePage)).call(this, config));

    _this2.editor = null;
    _this2.itemMap = {};
    return _this2;
  }

  _createClass(EditArticlePage, [{
    key: 'beforeCreate',
    value: function beforeCreate() {
      this.constants.EVENT_PUBLISH = 'EDIT_ARTICLE:EVNET_PUBLISH';
    }
  }, {
    key: 'create',
    value: function create() {
      var config = this.config;
      var $page = this.createRootElem('\n      <div data-uic-page="edit_article" class="uic-page edit-article-page">\n        <div class="uic-header">\n          <div class="uic-toolbar">\n            <div class="toolbar-container">\n              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>\n              <a href="javascript:;" class="toolbar-button" data-control="publish">Publish</a>\n            </div>\n            <div class="uic-title">\n              <div class="toolbar-title">\n                ' + config.title + '\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class="uic-content">\n          <div>\n            <input type="text" class="title" placeholder="title" />\n          </div>\n          <div class="editor-wrapper"></div>\n        </div>\n      </div>\n    ');

      var _this = this;

      this.nodes.$title = $page.find('input.title');

      bindNavBackEvent($page);

      // 绑定发布按钮被点击事件
      $page.find('[data-control="publish"]').on('click', function () {
        _this.publish();
      });

      // 编辑器配置项
      var editorConfig = {
        // 限制文件上传大小为 10 M
        fileSizeLimit: 10 * 1024 * 1024,
        fileSizeTip: 'File too large, maximum file size for uploads is 10MB',
        // 设置工具栏图标顺序
        menu: ['image', 'face', 'head', 'bold', 'italic', 'underline', 'strike'],
        // 加载自定义插件
        plugins: [plugins.plugin_uploadFile, plugins.plugin_sendEmoji, plugins.plugin_textFormat, plugins.plugin_parseEvent]
      };
      var editor = new Editor(editorConfig);

      editor
      // 渲染编辑器组件
      .render($page.find('.editor-wrapper'))
      // 监听文件上传事件
      .on(editor.constants.EVENT_UPLOAD_FILE, function (editor, event, file) {
        var _this3 = this;

        _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
          var dataUrl;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return getFileDataURL(file);

                case 2:
                  dataUrl = _context.sent;


                  editor.insertHtml('<img src="' + dataUrl + '" />');

                case 4:
                case 'end':
                  return _context.stop();
              }
            }
          }, _callee, _this3);
        }))();
      })
      // 监听粘贴事件
      .on(editor.constants.EVENT_PARSE, function (editor, event, msg) {
        var _this4 = this;

        if (msg.type === 'text') {
          // 粘贴文本

          var pasteHtml = msg.html;
          // 过滤无用标签
          pasteHtml = pasteHtml.replace(/<(meta|script|link).+?>/gim, '');
          // 去掉注释
          pasteHtml = pasteHtml.replace(/<!--.*?-->/gm, '');
          // 过滤 data-xxx 属性
          pasteHtml = pasteHtml.replace(/\s?data-.+?=('|").+?('|")/gim, '');

          editor.insertHtml(pasteHtml);
        } else if (msg.type === 'image') {
          // 粘贴图片

          var file = msg.data;

          _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2() {
            var dataUrl;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
              while (1) {
                switch (_context2.prev = _context2.next) {
                  case 0:
                    _context2.next = 2;
                    return getFileDataURL(file);

                  case 2:
                    dataUrl = _context2.sent;

                    // 将图片插入编辑器
                    editor.insertHtml('<img src="' + dataUrl + '">');

                  case 4:
                  case 'end':
                    return _context2.stop();
                }
              }
            }, _callee2, _this4);
          }))();
        }
      });

      this.editor = editor;
    }

    /**
     * 发表文章
     *
     * @event EVENT_PUBLISH 触发当前组件的发布事件
     */

  }, {
    key: 'publish',
    value: function publish() {
      var title = $.trim(this.nodes.$title.val());
      var text = this.editor.getText() + '...';
      var html = this.editor.getHtml();
      var images = this.editor.getImages();
      var description = void 0;

      // 截取文章描述信息
      if (text.length < 200) {
        description = text;
      } else {
        description = text.substring(0, 200) + '...';
      }

      // 正文不允许为空
      if (title.length === 0 || text.length === 0 && images.length === 0) {
        alert('The title or text can not be blank.');
        return;
      }

      var articleDataStr = JSON.stringify({
        title: title,
        content: html
      });

      // 计算正文字节数
      var htmlSize = sizeof(articleDataStr);
      // 生成正文 base64 字符串
      var base64Content = base64.encode(articleDataStr);

      // 生成文章消息
      var data = {
        type: 'article',
        info: {
          name: title,
          ext: 'article',
          size: htmlSize,
          len: base64Content.length,
          dataUrl: base64Content,
          md5sum: md5(base64Content),
          thumbnail: base64.encode(JSON.stringify({
            name: title,
            description: description,
            ext: 'article',
            size: htmlSize,
            len: base64Content.length,
            firstImage: null
          }))
        }
      };

      // 触发发表文章事件
      this.$elem.trigger(this.constants.EVENT_PUBLISH, data);

      // 初始化表单
      this.nodes.$title.val('');
      this.editor.empty();
    }
  }]);

  return EditArticlePage;
}(BaseComponent);