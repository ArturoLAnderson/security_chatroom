const { BaseComponent } = require('common.ui-components/base');
const { bindTabEvent } = require('common.ui-components/tab/utils');
const { DataList } = require('./data-list');
const { store } = require('src/store');

/**
 * @class
 *
 * 数据面板页面
 */
class DataPanelPage extends BaseComponent {
  constructor(config) {
    super(config);

    // 列表字典
    this.listMap = {};
  }

  create() {
    const _this = this;
    const $elem = this.createRootElem(`
      <div data-uic-page="data-panel" class="uic-page data-panel-page">
        <div class="uic-header">
          <div class="uic-toolbar">
            <div class="toolbar-container">
              <a href="javascript:;" class="toolbar-button" data-control="back">Back</a>
              <a href="javascript:;" class="toolbar-button"></a>
            </div>
            <div class="uic-title">
              <div class="toolbar-title">
                ${this.config.title}
              </div>
            </div>
          </div>
        </div>
        <div class="uic-content">
          <div class="uic-tabs">
            <div class="uic-tabbar">
              <a href="javascript:;" data-tab-type="article" data-target-tab="tab-article" class="tab-link">Article</a>
              <a href="javascript:;" data-tab-type="image" data-target-tab="tab-image" class="tab-link tab-link-active">Image</a>
              <a href="javascript:;" data-tab-type="file" data-target-tab="tab-file" class="tab-link">File</a>
            </div>
            <div class="uic-tab-panel">
              <div data-tab-name="tab-article" class="uic-tab uic-hide"></div>
              <div data-tab-name="tab-image" class="data-list__tab-image uic-tab uic-active"></div>
              <div data-tab-name="tab-file" class="uic-tab uic-hide"></div>
            </div>
          </div>
        </div>
      </div>
    `);

    // 为 tablink 按钮绑定点击事件
    bindTabEvent($elem);

    $elem.find('[data-control="back"]').on('click', function() {
      store.nav.back();
    });

    // 绑定 tab 栏按钮点击事件，被点击时获取最新列表数据
    $elem
      .find('.uic-tabbar')
      .find('.tab-link')
      .on('click', function() {
        // 获取列表类型
        const listType = $(this).data('tabType');
        // 重置列表并加载列表第一页数据
        _this.listMap[listType].reloadIfHasLastID();
      });

    // 创建数据列表
    _this.listMap['article'] = new DataList({ type: 'article' }).render(
      $elem.find('[data-tab-name="tab-article"]')
    );

    _this.listMap['image'] = new DataList({ type: 'image' }).render(
      $elem.find('[data-tab-name="tab-image"]')
    );

    _this.listMap['file'] = new DataList({ type: 'file' }).render(
      $elem.find('[data-tab-name="tab-file"]')
    );
  }

  /**
   * 获取当前处于可视状态的列表组件
   */
  getActivedDataList() {
    // 获取列表类型
    const listType = this.$elem
      .find('.uic-tabbar')
      .find('.tab-link-active')
      .data('tabType');

    return this.listMap[listType];
  }
}

exports.DataPanelPage = DataPanelPage;
