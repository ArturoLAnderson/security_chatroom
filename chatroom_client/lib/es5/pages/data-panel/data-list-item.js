'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('common.utils'),
    dataURItoBlob = _require.dataURItoBlob,
    createBlobUrl = _require.createBlobUrl,
    base64 = _require.base64;

var _require2 = require('common.ui-components/base'),
    BaseComponent = _require2.BaseComponent;

var _require3 = require('common.ui-components/loading'),
    Loading = _require3.Loading;

var _require4 = require('common.download/slice'),
    SliceTask = _require4.SliceTask;

var _require5 = require('../../store'),
    store = _require5.store;

var _require6 = require('../../utils'),
    showImageModal = _require6.showImageModal,
    getDefaultGIFDataURL = _require6.getDefaultGIFDataURL,
    cacheMessageData = _require6.cacheMessageData,
    getMessageDataCache = _require6.getMessageDataCache,
    hasMessageCache = _require6.hasMessageCache;

var _require7 = require('../article/article'),
    ArticlePage = _require7.ArticlePage;

var videoExtensions = require('../../utils/video-extentions');

var _require8 = require('../../modals/image-preview/image-preview'),
    ImagePreviewModal = _require8.ImagePreviewModal;

/**
 * @class
 * 数据列表组件
 */


var DataListItem = exports.DataListItem = function (_BaseComponent) {
  _inherits(DataListItem, _BaseComponent);

  /**
   * 数据列表子项组件
   * @param {Object} config
   */
  function DataListItem(config) {
    _classCallCheck(this, DataListItem);

    var defaultConfig = {
      type: null,
      isLazyMode: true,
      status: 'lazy'
    };

    config = Object.assign(defaultConfig, config);

    if (!config.type) {
      throw new Error('[DataListItem] config.type 不能为空，允许值：article、file、image');
    }

    // 记录父级元素
    var _this = _possibleConstructorReturn(this, (DataListItem.__proto__ || Object.getPrototypeOf(DataListItem)).call(this, config));

    _this.dataList = config.dataList;
    return _this;
  }

  _createClass(DataListItem, [{
    key: 'create',
    value: function create() {
      this.createRootElem(this._getItemHtml());

      this._bindEvent_onItemClick();
    }
  }, {
    key: 'onCreated',
    value: function onCreated() {
      var onCreated = this.config.onCreated;

      onCreated && onCreated(this);
    }

    /**
     * 生成列表项 HTML
     * @param {Array} items 从服务端返回的列表数据
     */

  }, {
    key: '_getItemHtml',
    value: function _getItemHtml() {
      var html = '';
      var config = this.config;
      var info = config.info;
      var type = config.type;

      // 如果已经缓存过为此 dataID 的文件、图片、文章类型数据
      // 就将消息体中的临时数据更换为缓存中的完整数据
      if (hasMessageCache(info)) {
        // 更换为完整数据
        var _dataUrl = getMessageDataCache(info.md5sum);

        // 如果是文件、图片类型，就将 dataURL 转换为 blobURL
        if (type === 'file' || type === 'image') {
          // 生成 blob URL
          var blob = dataURItoBlob(_dataUrl);
          var blobURL = createBlobUrl(blob);

          info.payload = blobURL;
        } else {
          info.dataUrl = _dataUrl;
        }

        // 将懒加载标志位设置为 false
        config.isLazyMode = false;
        config.status = 'done';
      }

      switch (type) {
        case 'image':
          {
            // 如果消息中图片数据不存在且扩展名为 gif
            // 就使用默认 GIF 预览图
            if (!info.payload && info.ext === 'gif') {
              info.payload = getDefaultGIFDataURL();
            }

            html = '\n          <a\n            href="javascript:;"\n            target="_blank"\n            class="uic-list__item"\n            >\n            <div class="list-item__content">\n              <div class="item-preview">\n                <img src="' + info.payload + '" />\n              </div>\n              <div class="item-info">\n                <div class="item-name uic-text-ellipsis">\n                  ' + info.name + '.' + info.ext + '\n                </div>\n              </div>\n              <div class="item-control">\n                <div class="item-status">\n                  <!-- <span style="color: \'red\'">\u4E0B\u8F7D\u5931\u8D25</span> -->\n                  <!-- <span>\u8FDB\u5EA6\u663E\u793A</span> -->\n                </div>\n              </div>\n            </div>\n          </a>\n        ';
            break;
          }
        case 'article':
          {
            var articleInfo = JSON.parse(base64.decode(info.payload));

            html = '\n          <a\n            href="javascript:;"\n            target="_blank"\n            class="uic-list__item"\n            >\n            <div class="list-item__content">\n              <div class="item-info">\n                <div class="item-name uic-text-ellipsis">\n                  ' + articleInfo.name + '\n                </div>\n                <div class="item-desc uic-text-ellipsis">\n                  ' + articleInfo.description + '\n                </div>\n              </div>\n              <div class="item-control">\n                <div class="item-status">\n                  <!-- <span style="color: \'red\'">\u4E0B\u8F7D\u5931\u8D25</span> -->\n                  <!-- <span>\u8FDB\u5EA6\u663E\u793A</span> -->\n                </div>\n              </div>\n            </div>\n          </a>\n        ';
            break;
          }
        case 'file':
          {
            if (config.isLazyMode) {
              html = '\n          <a\n            href="javascript:;"\n            target="_blank"\n            download="' + info.name + '.' + info.ext + '"\n            class="uic-list__item"\n            >\n            <div class="list-item__content">\n              <div class="item-preview">\n                <i class="iconfont icon-uic-cloud-dl"></i>\n              </div>\n              <div class="item-info">\n                <div class="item-name uic-text-ellipsis">\n                  ' + info.name + '.' + info.ext + '\n                </div>\n              </div>\n              <div class="item-control">\n                <div class="item-status">\n                  <!-- <span style="color: \'red\'">\u4E0B\u8F7D\u5931\u8D25</span> -->\n                  <!-- <span>\u8FDB\u5EA6\u663E\u793A</span> -->\n                </div>\n                <i class="iconfont icon-uic-right uic-hide"></i>\n              </div>\n            </div>\n          </a>\n        ';
            } else {
              html = '\n          <a\n            href="' + info.payload + '"\n            target="_blank"\n            download="' + info.name + '.' + info.ext + '"\n            class="uic-list__item"\n            >\n            <div class="list-item__content">\n              <div class="item-preview">\n                <i class="iconfont icon-uic-file"></i>\n              </div>\n              <div class="item-info">\n                <div class="item-name uic-text-ellipsis">\n                  ' + info.name + '.' + info.ext + '\n                </div>\n              </div>\n              <div class="item-control">\n                <div class="item-status">\n                  <!-- <span style="color: \'red\'">\u4E0B\u8F7D\u5931\u8D25</span> -->\n                  <!-- <span>\u8FDB\u5EA6\u663E\u793A</span> -->\n                </div>\n                <i class="iconfont icon-uic-right"></i>\n              </div>\n            </div>\n          </a>\n        ';
            }

            break;
          }

        default:
          {
            throw new Error('[data panel], Message type not recognized. type: ' + info.type);
          }
      }

      return html;
    }

    /**
     * 设置下载状态
     * @param {*} type
     * @param {*} value
     */

  }, {
    key: 'setStatus',
    value: function setStatus(type, value) {
      var item = this;
      var $elem = item.$elem;
      var config = item.config;
      var $status = $elem.find('.item-status');

      $status.empty();

      switch (type) {
        case 'load':
          {
            $status.html('<small>' + value + '</small>');
            config.isLoading = true;
            break;
          }

        case 'fail':
          {
            $status.html('<small style="color: \'red\'">error</small>');
            config.isLoading = false;
            break;
          }

        case 'done':
          {
            config.isLoading = false;
            break;
          }

        default:
          break;
      }
    }

    /**
     * 绑定列表项点击事件
     */

  }, {
    key: '_bindEvent_onItemClick',
    value: function _bindEvent_onItemClick() {
      var item = this;
      var $elem = item.$elem;

      $elem.on('click', function (event) {
        var config = item.config;

        if (item.config.type === 'image' && !store.isImageModalVisible) {
          var imagePreviewModal = new ImagePreviewModal({
            imgInfoList: item.dataList.imgInfoList,
            currentInfo: item.config.imgInfo
          }).render();

          store.imagePreviewModal = imagePreviewModal;
        }

        // 如果未处于懒加载模式或状态标志位显示已完成（done）
        // 就按类型触发相应点击事件
        if (!config.isLazyMode || config.status === 'done') {
          switch (config.type) {
            case 'article':
              {
                var pageName = 'read_article_' + store.getTagId();

                store.nav.push(pageName, new ArticlePage({
                  info: config.info
                })).navTo(pageName);
                break;
              }
            case 'image':
              {
                // 打开图片弹出层
                showImageModal($elem.find('.item-preview').find('img').attr('src'), 'data-list-page');

                break;
              }

            case 'file':
              {
                // 判断后缀名是否为视频格式
                var isVideoExt = videoExtensions.includes(config.info.ext.toLowerCase());

                // 如果是移动端并且当前文件为视频，就在新页面打开视频
                if (store.isMobile && isVideoExt) {
                  // 阻止 a 链接的默认事件执行
                  event.preventDefault();

                  // 提取 blob URL，在新页面打开
                  window.open($elem.attr('href'));
                }

                break;
              }
          }

          return;
        }

        var loading = void 0;

        // 如果当前列表项为文章类型，下载过程中弹出加载中效果，禁止用户进行其他操作
        if (item.config.type === 'article') {
          loading = new Loading({
            hasCloseBtn: true,
            onClosed: function onClosed() {
              store.currentArticleOpt = {};
            }
          });
          loading.render('#app');
          store.currentArticleOpt = {
            md5sum: config.info.md5sum,
            loading: loading
          };
        }

        // 如果当前正处于数据加载阶段，就不响应点击事件
        if (config.isLoading) {
          return;
        }

        // 配置切片下载任务参数
        var sliceConfig = {
          cm: store.clientMap.main,
          serverAddr: store.serverAddr,
          dataInfo: {
            // 指定期望消息数据在服务器中的纳秒级时间戳
            dataID: config.info.dataID,
            payloadLength: config.info.len
          }
        };

        sliceConfig.onProgress = function (value, offset, limit, total) {
          item.setStatus('load', (value / 1 * 100).toFixed(2) + '%');
          var imgInfo = item.config.imgInfo;

          imgInfo && imgInfo.onProgress && imgInfo.onProgress(value);
        };

        sliceConfig.onReceiveAll = function (dataUrl) {
          // console.log('item download', dataUrl);
          var imgInfo = item.config.imgInfo;

          imgInfo && imgInfo.onProgress && imgInfo.onProgress(1, dataUrl);

          var itemType = item.config.type;
          var info = item.config.info;

          item.setStatus('done');
          config.isLazyMode = false;
          info.dataUrl = dataUrl;

          // 如果消息详情中包含 dataID 字段，表示此消息数据支持缓存
          // 此处执行缓存操作
          if (info.hasOwnProperty('dataID')) {
            cacheMessageData(info.md5sum, dataUrl);
          }

          switch (itemType) {
            case 'image':
              {
                // 生成 blob URL
                var blob = dataURItoBlob(dataUrl);
                var blobURL = createBlobUrl(blob);

                $elem.find('.item-preview').empty().html('<img src="' + blobURL + '" />');

                // showImageModal(blobURL, 'data-list-page');
                break;
              }

            case 'article':
              {
                $elem.find('.icon-uic-cloud-dl').removeClass('icon-uic-cloud-dl').addClass('icon-uic-article');

                var _pageName = 'read_article_' + store.getTagId();

                if (store.currentArticleOpt.md5sum === config.info.md5sum) {
                  store.currentArticleOpt.loading.remove();
                  store.nav.push(_pageName, new ArticlePage({
                    info: config.info
                  })).navTo(_pageName);
                }

                break;
              }

            case 'file':
              {
                // 生成 blob URL
                var _blob = dataURItoBlob(dataUrl);
                var _blobURL = createBlobUrl(_blob);

                $elem.attr('href', _blobURL).find('.icon-uic-cloud-dl').removeClass('icon-uic-cloud-dl').addClass('icon-uic-file');

                $elem.find('.icon-uic-right').removeClass('uic-hide');

                break;
              }

            default:
              break;
          }
        };

        sliceConfig.onError = function (sliceNum, error) {
          console.log('onError', sliceNum, error);
          item.setStatus('fail');
        };

        // 初始化进度
        item.setStatus('load', '0%');

        // 创建并启动切片下载任务
        var sliceTask = new SliceTask(sliceConfig);
        sliceTask.start();
      });
    }
  }]);

  return DataListItem;
}(BaseComponent);

exports.DataListItem = DataListItem;