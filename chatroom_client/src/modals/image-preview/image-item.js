const { BaseComponent } = require('common.ui-components/base');
const { dataURItoBlob, createBlobUrl } = require('common.utils');

/**
 * @class
 * 图片组件
 */
class ImageItem extends BaseComponent {
  constructor(config) {
    // config.imgInfo = {
    //   dataID: '图片在服务器的 dataID',
    //   md5sum: '图片的 MD5',
    //   preview: '预览图 dataURL',
    //   imgSrc: '完整图片 src，dataURL 或 blobURL',
    //   payloadLength: '图片 dataURL 的字符数量'
    // }
    super(config);
  }

  create() {
    const config = this.config;
    const imgInfo = config.imgInfo;
    const $elem = this.createRootElem(
      `<div class="image-preview__item uic-hide"></div>`
    );

    // 如果有完整图片数据 URL 就直接显示完整图片，否则显示预览图
    const $img = $(
      `<img src="${imgInfo.imgSrc ? imgInfo.imgSrc : imgInfo.preview}" />`
    );

    $elem.append($img);
    this.nodes.$img = $img;
  }

  /**
   * 组件被渲染到浏览器后回调函数
   */
  onRendered() {
    const config = this.config;
    const imgSrc = config.imgInfo.imgSrc;

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
  reload() {
    const config = this.config;
    const imgInfo = config.imgInfo;

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
  updateLoad(value) {
    const $loadInner = this.nodes.$loadInner;

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
  hide() {
    this.$elem.addClass('uic-hide');

    return this;
  }

  /**
   * 展示当前预览图
   */
  show() {
    this.$elem.removeClass('uic-hide');

    return this;
  }

  /**
   * 加载图片
   * 使用分片下载从服务器获取完整的图片数据，并替换页面中的缩略图
   */
  loadImage() {
    const _this = this;
    const config = this.config;
    const imgInfo = config.imgInfo;
    // 创建“图片加载进度条”
    const $load = $('<div class="item__load"><div class="inner"></div></div>');
    const $loadInner = $load.find('.inner');

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
    imgInfo.onProgress = (value, dataUrl) => {
      _this.updateLoad(value);

      // 如果下载完成且有了完整图片数据，就生成 blobURL 更换预览图
      if (value === 1 && !!dataUrl) {
        // 生成 blob URL
        const blob = dataURItoBlob(dataUrl);
        const blobURL = createBlobUrl(blob);

        imgInfo.imgSrc = blobURL;
        _this.nodes.$img.attr('src', blobURL);
      }
    };
  }
}

exports.ImageItem = ImageItem;
