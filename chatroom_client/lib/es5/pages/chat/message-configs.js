'use strict';

var _require = require('common.utils'),
    base64 = _require.base64;

var _require2 = require('common.download/slice'),
    SliceTask = _require2.SliceTask;

var _require3 = require('../../store'),
    store = _require3.store;

var videoExtensions = require('../../utils/video-extentions');

var _require4 = require('../../modals/image-preview/image-preview'),
    ImagePreviewModal = _require4.ImagePreviewModal;

var _require5 = require('../../utils'),
    formatMessageTimestamp = _require5.formatMessageTimestamp,
    showImageModal = _require5.showImageModal,
    getDefaultGIFDataURL = _require5.getDefaultGIFDataURL,
    getMessageDataCache = _require5.getMessageDataCache,
    cacheMessageData = _require5.cacheMessageData,
    hasMessageCache = _require5.hasMessageCache;

var _require6 = require('../article/article'),
    ArticlePage = _require6.ArticlePage;

var _require7 = require('./utils'),
    getChatPageServerAddr = _require7.getChatPageServerAddr;

var _require8 = require('common.utils'),
    dataURItoBlob = _require8.dataURItoBlob,
    createBlobUrl = _require8.createBlobUrl,
    formatSizeDisplay = _require8.formatSizeDisplay;

/**
 * 生成 MessageItem 配置
 *
 * 图片、文件、文章类型消息时要根据是否为懒加载模式（isLazyMode）返回不同的 HTML 模板
 * @param {*} options
 *
 * @example
 *
 * const itemConfig = msgConfigs.getMessageItemConfig({
 *   pos: pos,
 *   user: store.user,
 *   message: message,
 *   timestamp: new Date().valueOf()
 * });
 *
 * itemConfig.onCreated.push(item => {
 *   sendMessage(item);
 * });
 *
 * chatPanel.addMessages([itemConfig]);
 *
 */


function getMessageItemConfig(options) {
  var message = options.message;
  var itemConfig = null;

  var info = message.info;
  var dateHtml = '\n    <div>\n      <small>' + formatMessageTimestamp(options.timestamp) + '</small>\n    </div>\n  ';

  // 如果已经缓存过为此 dataID 的文件、图片、文章类型数据
  // 就将消息体中的临时数据更换为缓存中的完整数据
  if (hasMessageCache(info)) {
    info.isLazyMode = false;
    info.dataUrl = getMessageDataCache(info.md5sum);
  }

  switch (message.type) {
    case 'text':
      {
        itemConfig = {
          type: 'text',
          messageHtml: '\n          <div>\n            ' + dateHtml + '\n            <p\n              class="item-message\n              item-message--text"\n            >\n              ' + info.text + '\n            </p>\n          </div>\n        ',
          onCreated: []
        };
        break;
      }

    case 'image':
      {
        // 当图片类型为 GIF 时，服务端返回的 dataURL 为 null
        // 在此做兼容处理
        if (info.dataUrl === null && info.ext === 'gif') {
          info.dataUrl = getDefaultGIFDataURL();
        }

        itemConfig = {
          type: 'image',
          messageHtml: '\n          <div>\n            ' + dateHtml + '\n            <img\n              src="' + info.dataUrl + '"\n              class="item-message item-message--image"\n            />\n          </div>\n        ',
          onCreated: [function (item) {
            onLazyMessageClick(item);
          }]
        };
        break;
      }

    case 'file':
      {
        if (info.isLazyMode) {
          itemConfig = {
            type: 'file',
            isLazyMode: true,
            messageHtml: '\n            <div>\n              ' + dateHtml + '\n              <a\n                href="javascript:;"\n                download="' + info.name + '.' + info.ext + '"\n                class="item-message item-message--file">\n                <div class="item-message__icon">\n                  <i class="iconfont icon-uic-cloud-dl"></i>\n                </div>\n\n                <div class="item-message__detail">\n                  <div class="item-message__file-title uic-text-ellipsis">\n                    ' + info.name + '.' + info.ext + '\n                  </div>\n\n                  <div class="item-message__file-size">\n                    <small>' + formatSizeDisplay(info.size) + '</small>\n                  </div>\n                </div>\n              </a>\n            </div>\n          ',
            onCreated: [function (item) {
              onLazyMessageClick(item);
            }]
          };
        } else {
          var blob = dataURItoBlob(info.dataUrl);
          var blobURL = createBlobUrl(blob);

          itemConfig = {
            type: 'file',
            messageHtml: '\n            <div>\n              ' + dateHtml + '\n              <a\n                href="' + blobURL + '"\n                download="' + info.name + '.' + info.ext + '"\n                class="item-message item-message--file"\n                >\n                <div class="item-message__icon">\n                  <i class="iconfont icon-uic-folder"></i>\n                </div>\n\n                <div class="item-message__detail">\n                  <div class="item-message__file-title uic-text-ellipsis">\n                    ' + info.name + '.' + info.ext + '\n                  </div>\n\n                  <div class="item-message__file-size">\n                    <small>' + formatSizeDisplay(info.size) + '</small>\n                  </div>\n                </div>\n              </a>\n            </div>\n            ',
            onCreated: [function (item) {
              onLazyMessageClick(item);
            }]
          };
        }
        break;
      }

    case 'article':
      {
        var thumbnail = void 0;

        if (info.isLazyMode) {
          thumbnail = info.dataUrl;
        } else {
          thumbnail = info.thumbnail;
        }

        thumbnail = JSON.parse(base64.decode(thumbnail));

        itemConfig = {
          type: 'article',
          messageHtml: '\n          <div>\n            ' + dateHtml + '\n            <div class="item-message item-message--article">\n              <div class="item-message__detail">\n                <div class="item-message__article-title">' + thumbnail.name + '</div>\n                <div class="item-message__article-meta">\n                  <small>' + thumbnail.description + '</small>\n                  <div class="item-message__icon">\n                    <i class="iconfont icon-uic-article"></i>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n        ',
          onCreated: [function (item) {
            onLazyMessageClick(item);
          }]
        };
        break;
      }

    default:
      console.log('Message type not recognized, type: ' + message.type);
      break;
  }

  var publicKey = options.user.publicKey;

  itemConfig.pos = options.pos;
  // '昵称 公钥后四位'
  itemConfig.title = options.user.nickname + ' ' + publicKey.substring(publicKey.length - 4, publicKey.length);
  itemConfig.isLazyMode = info.isLazyMode;
  itemConfig.message = options.message;
  itemConfig.timestamp = options.timestamp;
  itemConfig.serverTimestamp = options.serverTimestamp;

  return itemConfig;
}

exports.getMessageItemConfig = getMessageItemConfig;

/**
 * 缩略消息被点击时启动分片下载任务
 * @param {MessageItem} item 消息对象实例
 */
function onLazyMessageClick(item) {
  item.$elem.on('click', '.item-message', function (event) {
    // 如果已经从服务器获取过数据或处于非懒加载模式，就返回
    var message = item.config.message;

    if (item.config.type === 'image' && !store.isImageModalVisible) {
      var chatPage = store.nav.getPage('chat_page');

      var imagePreviewModal = new ImagePreviewModal({
        imgInfoList: chatPage.imgInfoList,
        currentInfo: item.config.imgInfo
      }).render();

      store.imagePreviewModal = imagePreviewModal;
    }

    if (!message.info.isLazyMode) {
      switch (item.config.type) {
        case 'article':
          {
            var pageName = 'read_article_' + store.getTagId();

            store.nav.push(pageName, new ArticlePage({
              info: item.config.message.info
            })).navTo(pageName);
            break;
          }

        case 'image':
          {
            showImageModal(item.$elem.find('.item-message--image').attr('src'), 'chat_page');
            break;
          }

        case 'file':
          {
            // 判断后缀名是否为视频格式
            var isVideoExt = videoExtensions.includes(message.info.ext.toLowerCase());

            // 如果是移动端并且当前文件为视频，就在新页面打开视频
            if (store.isMobile && isVideoExt) {
              // 阻止 a 链接的默认事件执行
              event.preventDefault();

              // 提取 blob URL，在新页面打开
              var blobURL = item.$elem.find('.item-message').attr('href');
              window.open(blobURL);
            }

            break;
          }

        default:
          break;
      }

      return;
    }

    // 如果收到的消息当前正处于数据加载阶段，就不触发点击事件
    if (item.config.pos === 'left' && item.status === 'load') {
      return;
    }

    // 从 chatPage 获取灯塔的地址
    var serverAddr = getChatPageServerAddr(item);

    // 配置切片下载任务参数
    var sliceConfig = {
      cm: store.clientMap.main,
      serverAddr: serverAddr,
      dataInfo: {
        dataID: message.info.dataID,
        payloadLength: message.info.len
      }
    };

    // 下载进度回调函数
    sliceConfig.onProgress = function (value, offset, limit, total) {
      item.setStatus('load', (value / 1 * 100).toFixed(2) + '%');

      var imgInfo = item.config.imgInfo;

      imgInfo && imgInfo.onProgress && imgInfo.onProgress(value);
    };

    // 下载完成回调函数
    sliceConfig.onReceiveAll = function (dataUrl) {
      var _info = message.info;

      var imgInfo = item.config.imgInfo;

      imgInfo && imgInfo.onProgress && imgInfo.onProgress(1, dataUrl);

      item.setStatus('done');
      _info.isLazyMode = false;
      _info.dataUrl = dataUrl;

      // 如果消息详情中包含 dataID 字段，表示此消息数据支持缓存
      // 此处执行缓存操作
      if (_info.hasOwnProperty('dataID')) {
        cacheMessageData(_info.md5sum, dataUrl);
      }

      switch (item.config.type) {
        case 'image':
          {
            // 生成 blob URL
            var blob = dataURItoBlob(dataUrl);
            var _blobURL = createBlobUrl(blob);

            item.$elem.find('.item-message--image').attr('src', _blobURL);
            // showImageModal(blobURL, 'chat_page');

            break;
          }

        case 'article':
          {
            item.$elem.find('.icon-uic-cloud-dl').removeClass('icon-uic-cloud-dl').addClass('icon-uic-article');

            var _pageName = 'read_article_' + store.getTagId();

            store.nav.push(_pageName, new ArticlePage({
              info: item.config.message.info
            })).navTo(_pageName);

            break;
          }

        case 'file':
          {
            // 生成 blob URL
            var _blob = dataURItoBlob(dataUrl);
            var _blobURL2 = createBlobUrl(_blob);

            item.$elem.find('.item-message').attr('href', _blobURL2);

            item.$elem.find('.icon-uic-cloud-dl').removeClass('icon-uic-cloud-dl').addClass('icon-uic-folder');

            break;
          }

        default:
          break;
      }
    };

    // 下载失败回调函数
    sliceConfig.onError = function (sliceNum, error) {
      console.log('onError', sliceNum, error);
      item.setStatus('fail');
    };

    // 初始化进度
    item.setStatus('load', '0%');
    // 创建并启动分片下载任务
    var sliceTask = new SliceTask(sliceConfig);
    sliceTask.start();
  });
}