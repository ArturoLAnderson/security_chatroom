/**
 * 文章浏览页面
 */
const { BaseComponent } = require('common.ui-components/base');
const { base64 } = require('common.utils');

const { bindNavBackEvent } = require('src/utils');

export class ArticlePage extends BaseComponent {
  constructor(config) {
    super(config);
  }

  create() {
    const $elem = this.createRootElem(
      `<div data-uic-page="read_article" class="uic-page read-article-page">
        <div class="uic-header">
          <div class="uic-toolbar">
            <div class="toolbar-container">
              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>
              <a href="javascript:;" class="toolbar-button"></a>
            </div>
            <div class="uic-title">
              <div class="toolbar-title">
                Article
              </div>
            </div>
          </div>
        </div>
        <div class="uic-content">
          <div class="inner"></div>
        </div>
      </div>`
    );

    const info = this.config.info;
    const $content = $elem.find('.uic-content').find('.inner');
    const articleData = JSON.parse(base64.decode(info.dataUrl));

    // 渲染标题
    $content.append(`<h1 class="title">${articleData.title}</h1>`);
    // 渲染正文
    $content.append(`<div class="content">${articleData.content}</div>`);

    // 绑定后退按钮事件
    bindNavBackEvent($elem);
  }
}
