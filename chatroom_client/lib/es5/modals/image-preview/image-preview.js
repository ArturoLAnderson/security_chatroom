'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('./image-preview.css');

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('common.ui-components/modal'),
    Modal = _require2.Modal;

var _require3 = require('common.utils'),
    createBlobUrl = _require3.createBlobUrl,
    dataURItoBlob = _require3.dataURItoBlob;

var _require4 = require('../../store'),
    store = _require4.store;

var _require5 = require('../../utils'),
    throttle = _require5.throttle;

var _require6 = require('../../utils'),
    hasDataCacheByMD5 = _require6.hasDataCacheByMD5,
    getMessageDataCache = _require6.getMessageDataCache;

var _require7 = require('./image-item'),
    ImageItem = _require7.ImageItem;

/**
 * @class
 * 图片预览组件
 */


var ImagePreviewModal = function (_BaseComponent) {
  _inherits(ImagePreviewModal, _BaseComponent);

  function ImagePreviewModal(config) {
    _classCallCheck(this, ImagePreviewModal);

    // 当前被激活的 item
    var _this2 = _possibleConstructorReturn(this, (ImagePreviewModal.__proto__ || Object.getPrototypeOf(ImagePreviewModal)).call(this, config));
    // config = {
    //   imgInfoList: [], // 图片信息列表
    //   currentInfo: obj // 当前图片信息
    // }


    _this2.currentItem = null;
    // item 字典，key 为图片信息在 config.imgInfoList 中的索引
    _this2.itemMap = {};
    return _this2;
  }

  _createClass(ImagePreviewModal, [{
    key: 'create',
    value: function create() {
      var _this = this;
      var config = this.config;

      var $elem = _this.createRootElem('\n      <div class="uic-preview-wrapper">\n        <div class="uic-preview-body">\n        </div>\n\n        <a href="javascript:;" class="image-preview__btn btn--prev-image">\n          <i class="iconfont icon-uic-control-left"></i>\n        </a>\n\n        <a href="javascript:;" class="image-preview__btn btn--next-image">\n          <i class="iconfont icon-uic-control-right"></i>\n        </a>\n\n        <div class="image-preview__title">1/10</div>\n      </div>\n    ');

      var $preview = $elem.find('.uic-preview-body');
      var $btnPrev = $elem.find('.btn--prev-image');
      var $btnNext = $elem.find('.btn--next-image');
      var $title = $elem.find('.image-preview__title');

      _this.nodes.$preview = $preview;
      _this.nodes.$btnPrev = $btnPrev;
      _this.nodes.$btnNext = $btnNext;
      _this.nodes.$title = $title;

      // 绑定上一张图片按钮点击事件
      $btnPrev.on('click', function () {
        var index = config.imgInfoList.indexOf(_this.currentItem.config.imgInfo);

        _this.addImageItem(config.imgInfoList[index - 1]);

        return false;
      });

      // 绑定下一张图片按钮点击事件
      $btnNext.on('click', function () {
        var index = config.imgInfoList.indexOf(_this.currentItem.config.imgInfo);

        _this.addImageItem(config.imgInfoList[index + 1]);

        return false;
      });

      // 创建弹出层
      var modal = new Modal({
        showBackdrop: true,
        body: _this.$elem,
        beforeCreate: function beforeCreate() {
          store.isImageModalVisible = true;
        },
        onClosed: function onClosed() {
          store.isImageModalVisible = false;
        }
      });

      // 将弹出层渲染到 body
      modal.render('body');

      // 绑定图片预览区域鼠标滚轮事件，阻止图片预览面板的事件冒泡
      $preview.on('mousewheel', function (event) {
        event.stopPropagation();
      });

      // 绑定弹出层鼠标滚轮事件，同步滚轮事件到图片预览区域
      modal.$elem.on('mousewheel', function (event) {
        // 如果在图片预览区域外触发滚动事件，就将滚动同步到图片预览区域
        if (!__isPreviewElem(event.target)) {
          var top = $preview.scrollTop();

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
  }, {
    key: 'onCreated',
    value: function onCreated() {
      // HTML 元素创建完毕后天就默认图片预览项
      this.addImageItem(this.config.currentInfo);
    }

    /**
     * 刷新上一张、下一张按钮的显示状态
     */

  }, {
    key: 'refreshBtns',
    value: function refreshBtns() {
      var config = this.config;
      var nodes = this.nodes;
      // 获取当前图片在列表中的索引
      var index = config.imgInfoList.indexOf(this.currentItem.config.imgInfo);

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

  }, {
    key: 'refreshTitle',
    value: function refreshTitle() {
      var config = this.config;
      var nodes = this.nodes;
      var index = config.imgInfoList.indexOf(this.currentItem.config.imgInfo);

      nodes.$title.text(index + 1 + '/' + config.imgInfoList.length);
    }

    /**
     * 添加预览图
     * @param {Object} imgInfo
     */

  }, {
    key: 'addImageItem',
    value: function addImageItem(imgInfo) {
      // 如果图片有缓存就更新预览信息中的完整图片 URL，如 dataURL 或 blobURL
      if (hasDataCacheByMD5(imgInfo.md5sum)) {
        var dataUrl = getMessageDataCache(imgInfo.md5sum);
        imgInfo.imgSrc = createBlobUrl(dataURItoBlob(dataUrl));
      }

      // 隐藏当前正在显示的预览图
      this.currentItem && this.currentItem.hide();

      var index = this.config.imgInfoList.indexOf(imgInfo);

      var item = this.itemMap[index];
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

  }, {
    key: 'loadNextImageItem',
    value: function loadNextImageItem() {
      var config = this.config;
      // 获取当前预览图索引
      var index = this.config.imgInfoList.indexOf(this.currentItem.config.imgInfo);
      // 获取下一张预览图信息
      var nextItemIndex = index + 1;
      var nextItem = this.itemMap[nextItemIndex];
      var nextImageInfo = config.imgInfoList[nextItemIndex];

      // 如果又下一张图片需要预览，并且未被渲染过就生成该 imageItem
      if (nextItemIndex < config.imgInfoList.length && !nextItem) {
        var item = new ImageItem({ imgInfo: nextImageInfo });
        item.render(this.nodes.$preview);
        this.itemMap[nextItemIndex] = item;
      }
    }
  }]);

  return ImagePreviewModal;
}(BaseComponent);

exports.ImagePreviewModal = ImagePreviewModal;