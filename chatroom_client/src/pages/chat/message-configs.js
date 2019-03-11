const { base64 } = require('common.utils');
const { SliceTask } = require('common.download/slice');
const { store } = require('src/store');
const videoExtensions = require('src/utils/video-extentions');

const { ImagePreviewModal } = require('src/modals/image-preview/image-preview');

const {
  formatMessageTimestamp,
  showImageModal,
  getDefaultGIFDataURL,
  getMessageDataCache,
  cacheMessageData,
  hasMessageCache
} = require('src/utils');
const { ArticlePage } = require('src/pages/article/article');
const { getChatPageServerAddr } = require('./utils');

const {
  dataURItoBlob,
  createBlobUrl,
  formatSizeDisplay
} = require('common.utils');

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
  const message = options.message;
  let itemConfig = null;

  const info = message.info;
  const dateHtml = `
    <div>
      <small>${formatMessageTimestamp(options.timestamp)}</small>
    </div>
  `;

  // 如果已经缓存过为此 dataID 的文件、图片、文章类型数据
  // 就将消息体中的临时数据更换为缓存中的完整数据
  if (hasMessageCache(info)) {
    info.isLazyMode = false;
    info.dataUrl = getMessageDataCache(info.md5sum);
  }

  switch (message.type) {
    case 'text': {
      itemConfig = {
        type: 'text',
        messageHtml: `
          <div>
            ${dateHtml}
            <p
              class="item-message
              item-message--text"
            >
              ${info.text}
            </p>
          </div>
        `,
        onCreated: []
      };
      break;
    }

    case 'image': {
      // 当图片类型为 GIF 时，服务端返回的 dataURL 为 null
      // 在此做兼容处理
      if (info.dataUrl === null && info.ext === 'gif') {
        info.dataUrl = getDefaultGIFDataURL();
      }

      itemConfig = {
        type: 'image',
        messageHtml: `
          <div>
            ${dateHtml}
            <img
              src="${info.dataUrl}"
              class="item-message item-message--image"
            />
          </div>
        `,
        onCreated: [
          item => {
            onLazyMessageClick(item);
          }
        ]
      };
      break;
    }

    case 'file': {
      if (info.isLazyMode) {
        itemConfig = {
          type: 'file',
          isLazyMode: true,
          messageHtml: `
            <div>
              ${dateHtml}
              <a
                href="javascript:;"
                download="${info.name}.${info.ext}"
                class="item-message item-message--file">
                <div class="item-message__icon">
                  <i class="iconfont icon-uic-cloud-dl"></i>
                </div>

                <div class="item-message__detail">
                  <div class="item-message__file-title uic-text-ellipsis">
                    ${info.name}.${info.ext}
                  </div>

                  <div class="item-message__file-size">
                    <small>${formatSizeDisplay(info.size)}</small>
                  </div>
                </div>
              </a>
            </div>
          `,
          onCreated: [
            item => {
              onLazyMessageClick(item);
            }
          ]
        };
      } else {
        const blob = dataURItoBlob(info.dataUrl);
        const blobURL = createBlobUrl(blob);

        itemConfig = {
          type: 'file',
          messageHtml: `
            <div>
              ${dateHtml}
              <a
                href="${blobURL}"
                download="${info.name}.${info.ext}"
                class="item-message item-message--file"
                >
                <div class="item-message__icon">
                  <i class="iconfont icon-uic-folder"></i>
                </div>

                <div class="item-message__detail">
                  <div class="item-message__file-title uic-text-ellipsis">
                    ${info.name}.${info.ext}
                  </div>

                  <div class="item-message__file-size">
                    <small>${formatSizeDisplay(info.size)}</small>
                  </div>
                </div>
              </a>
            </div>
            `,
          onCreated: [
            item => {
              onLazyMessageClick(item);
            }
          ]
        };
      }
      break;
    }

    case 'article': {
      let thumbnail;

      if (info.isLazyMode) {
        thumbnail = info.dataUrl;
      } else {
        thumbnail = info.thumbnail;
      }

      thumbnail = JSON.parse(base64.decode(thumbnail));

      itemConfig = {
        type: 'article',
        messageHtml: `
          <div>
            ${dateHtml}
            <div class="item-message item-message--article">
              <div class="item-message__detail">
                <div class="item-message__article-title">${thumbnail.name}</div>
                <div class="item-message__article-meta">
                  <small>${thumbnail.description}</small>
                  <div class="item-message__icon">
                    <i class="iconfont icon-uic-article"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `,
        onCreated: [
          item => {
            onLazyMessageClick(item);
          }
        ]
      };
      break;
    }

    default:
      console.log(`Message type not recognized, type: ${message.type}`);
      break;
  }

  const publicKey = options.user.publicKey;

  itemConfig.pos = options.pos;
  // '昵称 公钥后四位'
  itemConfig.title = `${options.user.nickname} ${publicKey.substring(
    publicKey.length - 4,
    publicKey.length
  )}`;
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
  item.$elem.on('click', '.item-message', function(event) {
    // 如果已经从服务器获取过数据或处于非懒加载模式，就返回
    const message = item.config.message;

    if (item.config.type === 'image' && !store.isImageModalVisible) {
      const chatPage = store.nav.getPage('chat_page');

      const imagePreviewModal = new ImagePreviewModal({
        imgInfoList: chatPage.imgInfoList,
        currentInfo: item.config.imgInfo
      }).render();

      store.imagePreviewModal = imagePreviewModal;
    }

    if (!message.info.isLazyMode) {
      switch (item.config.type) {
        case 'article': {
          const pageName = `read_article_${store.getTagId()}`;

          store.nav
            .push(
              pageName,
              new ArticlePage({
                info: item.config.message.info
              })
            )
            .navTo(pageName);
          break;
        }

        case 'image': {
          showImageModal(
            item.$elem.find('.item-message--image').attr('src'),
            'chat_page'
          );
          break;
        }

        case 'file': {
          // 判断后缀名是否为视频格式
          const isVideoExt = videoExtensions.includes(
            message.info.ext.toLowerCase()
          );

          // 如果是移动端并且当前文件为视频，就在新页面打开视频
          if (store.isMobile && isVideoExt) {
            // 阻止 a 链接的默认事件执行
            event.preventDefault();

            // 提取 blob URL，在新页面打开
            const blobURL = item.$elem.find('.item-message').attr('href');
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
    const serverAddr = getChatPageServerAddr(item);

    // 配置切片下载任务参数
    const sliceConfig = {
      cm: store.clientMap.main,
      serverAddr: serverAddr,
      dataInfo: {
        dataID: message.info.dataID,
        payloadLength: message.info.len
      }
    };

    // 下载进度回调函数
    sliceConfig.onProgress = (value, offset, limit, total) => {
      item.setStatus('load', `${((value / 1) * 100).toFixed(2)}%`);

      const imgInfo = item.config.imgInfo;

      imgInfo && imgInfo.onProgress && imgInfo.onProgress(value);
    };

    // 下载完成回调函数
    sliceConfig.onReceiveAll = dataUrl => {
      const _info = message.info;

      const imgInfo = item.config.imgInfo;

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
        case 'image': {
          // 生成 blob URL
          const blob = dataURItoBlob(dataUrl);
          const blobURL = createBlobUrl(blob);

          item.$elem.find('.item-message--image').attr('src', blobURL);
          // showImageModal(blobURL, 'chat_page');

          break;
        }

        case 'article': {
          item.$elem
            .find('.icon-uic-cloud-dl')
            .removeClass('icon-uic-cloud-dl')
            .addClass('icon-uic-article');

          const pageName = `read_article_${store.getTagId()}`;

          store.nav
            .push(
              pageName,
              new ArticlePage({
                info: item.config.message.info
              })
            )
            .navTo(pageName);

          break;
        }

        case 'file': {
          // 生成 blob URL
          const blob = dataURItoBlob(dataUrl);
          const blobURL = createBlobUrl(blob);

          item.$elem.find('.item-message').attr('href', blobURL);

          item.$elem
            .find('.icon-uic-cloud-dl')
            .removeClass('icon-uic-cloud-dl')
            .addClass('icon-uic-folder');

          break;
        }

        default:
          break;
      }
    };

    // 下载失败回调函数
    sliceConfig.onError = (sliceNum, error) => {
      console.log('onError', sliceNum, error);
      item.setStatus('fail');
    };

    // 初始化进度
    item.setStatus('load', '0%');
    // 创建并启动分片下载任务
    const sliceTask = new SliceTask(sliceConfig);
    sliceTask.start();
  });
}
