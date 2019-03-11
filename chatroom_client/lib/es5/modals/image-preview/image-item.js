'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('common.utils'),
    dataURItoBlob = _require2.dataURItoBlob,
    createBlobUrl = _require2.createBlobUrl;

/**
 * @class
 * 图片组件
 */


var ImageItem = function (_BaseComponent) {
  _inherits(ImageItem, _BaseComponent);

  function ImageItem(config) {
    _classCallCheck(this, ImageItem);

    // config.imgInfo = {
    //   dataID: '图片在服务器的 dataID',
    //   md5sum: '图片的 MD5',
    //   preview: '预览图 dataURL',
    //   imgSrc: '完整图片 src，dataURL 或 blobURL',
    //   payloadLength: '图片 dataURL 的字符数量'
    // }
    return _possibleConstructorReturn(this, (ImageItem.__proto__ || Object.getPrototypeOf(ImageItem)).call(this, config));
  }

  _createClass(ImageItem, [{
    key: 'create',
    value: function create() {
      var config = this.config;
      var imgInfo = config.imgInfo;
      var $elem = this.createRootElem('<div class="image-preview__item uic-hide"></div>');

      // 如果有完整图片数据 URL 就直接显示完整图片，否则显示预览图
      var $img = $('<img src="' + (imgInfo.imgSrc ? imgInfo.imgSrc : imgInfo.preview) + '" />');

      $elem.append($img);
      this.nodes.$img = $img;
    }

    /**
     * 组件被渲染到浏览器后回调函数
     */

  }, {
    key: 'onRendered',
    value: function onRendered() {
      var config = this.config;
      var imgSrc = config.imgInfo.imgSrc;

      // 如果图片信息中无完整图片 URL，就执行图片加载函数
      if (!imgSrc) {
        this.loadImage();
      }

      // 调用图片预览回调函数
      config.imgInfo.onPreview && config.imgInfo.onPreview();
    }

    /**
     * 重新加载图片
     */

  }, {
    key: 'reload',
    value: function reload() {
      var config = this.config;
      var imgInfo = config.imgInfo;

      // 检测是否已经有了完整图片数据，如果有了就显示到浏览器并结束进度条
      if (imgInfo.imgSrc) {
        this.nodes.$img.attr('src', imgInfo.imgSrc);
        this.updateLoad(1);
      }

      return this;
    }

    /**
     * 更新进度条
     * @param {Number} value 进度值
     */

  }, {
    key: 'updateLoad',
    value: function updateLoad(value) {
      var $loadInner = this.nodes.$loadInner;

      if ($loadInner) {
        $loadInner.circleProgress('value', value);

        // 如果进度加载完成就隐藏进度条
        if (value === 1) {
          $loadInner.parent().addClass('uic-hide');
        }
      }
    }

    /**
     * 隐藏当前预览图
     */

  }, {
    key: 'hide',
    value: function hide() {
      this.$elem.addClass('uic-hide');

      return this;
    }

    /**
     * 展示当前预览图
     */

  }, {
    key: 'show',
    value: function show() {
      this.$elem.removeClass('uic-hide');

      return this;
    }

    /**
     * 加载图片
     * 使用分片下载从服务器获取完整的图片数据，并替换页面中的缩略图
     */

  }, {
    key: 'loadImage',
    value: function loadImage() {
      var _this = this;
      var config = this.config;
      var imgInfo = config.imgInfo;
      // 创建“图片加载进度条”
      var $load = $('<div class="item__load"><div class="inner"></div></div>');
      var $loadInner = $load.find('.inner');

      _this.$elem.append($load);
      _this.nodes.$load = $load;
      _this.nodes.$loadInner = $loadInner;

      // 绘制进度条
      $loadInner.circleProgress({
        startAngle: -Math.PI / 2,
        value: 0,
        size: 25,
        thickness: 3,
        animation: false,
        fill: '#fff'
      });

      // 添加图片下载进度回调函数供下载任务调用
      imgInfo.onProgress = function (value, dataUrl) {
        _this.updateLoad(value);

        // 如果下载完成且有了完整图片数据，就生成 blobURL 更换预览图
        if (value === 1 && !!dataUrl) {
          // 生成 blob URL
          var blob = dataURItoBlob(dataUrl);
          var blobURL = createBlobUrl(blob);

          imgInfo.imgSrc = blobURL;
          _this.nodes.$img.attr('src', blobURL);
        }
      };
    }
  }]);

  return ImageItem;
}(BaseComponent);

exports.ImageItem = ImageItem;