require('./image-preview.css');

const { BaseComponent } = require('common.ui-components/base');
const { Modal } = require('common.ui-components/modal');
const { createBlobUrl, dataURItoBlob } = require('common.utils');

const { store } = require('src/store');
const { throttle } = require('src/utils');
const { hasDataCacheByMD5, getMessageDataCache } = require('src/utils');
const { ImageItem } = require('./image-item');

/**
 * @class
 * 图片预览组件
 */
class ImagePreviewModal extends BaseComponent {
  constructor(config) {
    // config = {
    //   imgInfoList: [], // 图片信息列表
    //   currentInfo: obj // 当前图片信息
    // }
    super(config);

    // 当前被激活的 item
    this.currentItem = null;
    // item 字典，key 为图片信息在 config.imgInfoList 中的索引
    this.itemMap = {};
  }

  create() {
    const _this = this;
    const config = this.config;

    const $elem = _this.createRootElem(`
      <div class="uic-preview-wrapper">
        <div class="uic-preview-body">
        </div>

        <a href="javascript:;" class="image-preview__btn btn--prev-image">
          <i class="iconfont icon-uic-control-left"></i>
        </a>

        <a href="javascript:;" class="image-preview__btn btn--next-image">
          <i class="iconfont icon-uic-control-right"></i>
        </a>

        <div class="image-preview__title">1/10</div>
      </div>
    `);

    const $preview = $elem.find('.uic-preview-body');
    const $btnPrev = $elem.find('.btn--prev-image');
    const $btnNext = $elem.find('.btn--next-image');
    const $title = $elem.find('.image-preview__title');

    _this.nodes.$preview = $preview;
    _this.nodes.$btnPrev = $btnPrev;
    _this.nodes.$btnNext = $btnNext;
    _this.nodes.$title = $title;

    // 绑定上一张图片按钮点击事件
    $btnPrev.on('click', function() {
      const index = config.imgInfoList.indexOf(
        _this.currentItem.config.imgInfo
      );

      _this.addImageItem(config.imgInfoList[index - 1]);

      return false;
    });

    // 绑定下一张图片按钮点击事件
    $btnNext.on('click', function() {
      const index = config.imgInfoList.indexOf(
        _this.currentItem.config.imgInfo
      );

      _this.addImageItem(config.imgInfoList[index + 1]);

      return false;
    });

    // 创建弹出层
    const modal = new Modal({
      showBackdrop: true,
      body: _this.$elem,
      beforeCreate() {
        store.isImageModalVisible = true;
      },
      onClosed() {
        store.isImageModalVisible = false;
      }
    });

    // 将弹出层渲染到 body
    modal.render('body');

    // 绑定图片预览区域鼠标滚轮事件，阻止图片预览面板的事件冒泡
    $preview.on('mousewheel', function(event) {
      event.stopPropagation();
    });

    // 绑定弹出层鼠标滚轮事件，同步滚轮事件到图片预览区域
    modal.$elem.on('mousewheel', function(event) {
      // 如果在图片预览区域外触发滚动事件，就将滚动同步到图片预览区域
      if (!__isPreviewElem(event.target)) {
        let top = $preview.scrollTop();

        $preview.scrollTop(top - event.originalEvent.wheelDelta);

        return false;
      }

      /**
       * 判断是否是图片预览区域的元素
       * @param {HTMLElement} elem
       */
      function __isPreviewElem(elem) {
        return $.contains($preview.get(0), elem) || $preview.is(elem);
      }
    });
  }

  onCreated() {
    // HTML 元素创建完毕后天就默认图片预览项
    this.addImageItem(this.config.currentInfo);
  }

  /**
   * 刷新上一张、下一张按钮的显示状态
   */
  refreshBtns() {
    const config = this.config;
    const nodes = this.nodes;
    // 获取当前图片在列表中的索引
    const index = config.imgInfoList.indexOf(this.currentItem.config.imgInfo);

    // 第一张图片，隐藏“上一张”按钮
    if (index === 0) {
      nodes.$btnPrev.addClass('uic-hide');
    } else {
      nodes.$btnPrev.removeClass('uic-hide');
    }

    // 最后一张图片，隐藏“下一张”按钮
    if (index === config.imgInfoList.length - 1) {
      nodes.$btnNext.addClass('uic-hide');
    } else {
      nodes.$btnNext.removeClass('uic-hide');
    }
  }

  /**
   * 刷新标题内容，如当前是第几张图片及总图片数量
   */
  refreshTitle() {
    const config = this.config;
    const nodes = this.nodes;
    const index = config.imgInfoList.indexOf(this.currentItem.config.imgInfo);

    nodes.$title.text(`${index + 1}/${config.imgInfoList.length}`);
  }

  /**
   * 添加预览图
   * @param {Object} imgInfo
   */
  addImageItem(imgInfo) {
    // 如果图片有缓存就更新预览信息中的完整图片 URL，如 dataURL 或 blobURL
    if (hasDataCacheByMD5(imgInfo.md5sum)) {
      const dataUrl = getMessageDataCache(imgInfo.md5sum);
      imgInfo.imgSrc = createBlobUrl(dataURItoBlob(dataUrl));
    }

    // 隐藏当前正在显示的预览图
    this.currentItem && this.currentItem.hide();

    const index = this.config.imgInfoList.indexOf(imgInfo);

    let item = this.itemMap[index];
    // 查看期望被显示的图片是否已经被创建过预览
    if (!item) {
      item = new ImageItem({ imgInfo: imgInfo });
      item.render(this.nodes.$preview);
      this.itemMap[index] = item;
    }

    // 展示预览图
    item.show().reload();

    this.currentItem = item;

    // 刷新界面
    this.refreshBtns();
    this.refreshTitle();
    // 预加载下一张预览图
    this.loadNextImageItem();
  }

  /**
   * 预加载下一张预览图
   */
  loadNextImageItem() {
    const config = this.config;
    // 获取当前预览图索引
    const index = this.config.imgInfoList.indexOf(
      this.currentItem.config.imgInfo
    );
    // 获取下一张预览图信息
    let nextItemIndex = index + 1;
    let nextItem = this.itemMap[nextItemIndex];
    let nextImageInfo = config.imgInfoList[nextItemIndex];

    // 如果又下一张图片需要预览，并且未被渲染过就生成该 imageItem
    if (nextItemIndex < config.imgInfoList.length && !nextItem) {
      const item = new ImageItem({ imgInfo: nextImageInfo });
      item.render(this.nodes.$preview);
      this.itemMap[nextItemIndex] = item;
    }
  }
}

exports.ImagePreviewModal = ImagePreviewModal;
