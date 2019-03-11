const { dataURItoBlob, createBlobUrl, base64 } = require('common.utils');
const { BaseComponent } = require('common.ui-components/base');
const { Loading } = require('common.ui-components/loading');
const { SliceTask } = require('common.download/slice');
const { store } = require('src/store');
const {
  showImageModal,
  getDefaultGIFDataURL,
  cacheMessageData,
  getMessageDataCache,
  hasMessageCache
} = require('src/utils');
const { ArticlePage } = require('src/pages/article/article');
const videoExtensions = require('src/utils/video-extentions');
const { ImagePreviewModal } = require('src/modals/image-preview/image-preview');

/**
 * @class
 * 数据列表组件
 */
export class DataListItem extends BaseComponent {
  /**
   * 数据列表子项组件
   * @param {Object} config
   */
  constructor(config) {
    const defaultConfig = {
      type: null,
      isLazyMode: true,
      status: 'lazy'
    };

    config = Object.assign(defaultConfig, config);

    if (!config.type) {
      throw new Error(
        '[DataListItem] config.type 不能为空，允许值：article、file、image'
      );
    }
    super(config);

    // 记录父级元素
    this.dataList = config.dataList;
  }

  create() {
    this.createRootElem(this._getItemHtml());

    this._bindEvent_onItemClick();
  }

  onCreated() {
    const onCreated = this.config.onCreated;

    onCreated && onCreated(this);
  }

  /**
   * 生成列表项 HTML
   * @param {Array} items 从服务端返回的列表数据
   */
  _getItemHtml() {
    let html = '';
    const config = this.config;
    const info = config.info;
    const type = config.type;

    // 如果已经缓存过为此 dataID 的文件、图片、文章类型数据
    // 就将消息体中的临时数据更换为缓存中的完整数据
    if (hasMessageCache(info)) {
      // 更换为完整数据
      const _dataUrl = getMessageDataCache(info.md5sum);

      // 如果是文件、图片类型，就将 dataURL 转换为 blobURL
      if (type === 'file' || type === 'image') {
        // 生成 blob URL
        const blob = dataURItoBlob(_dataUrl);
        const blobURL = createBlobUrl(blob);

        info.payload = blobURL;
      } else {
        info.dataUrl = _dataUrl;
      }

      // 将懒加载标志位设置为 false
      config.isLazyMode = false;
      config.status = 'done';
    }

    switch (type) {
      case 'image': {
        // 如果消息中图片数据不存在且扩展名为 gif
        // 就使用默认 GIF 预览图
        if (!info.payload && info.ext === 'gif') {
          info.payload = getDefaultGIFDataURL();
        }

        html = `
          <a
            href="javascript:;"
            target="_blank"
            class="uic-list__item"
            >
            <div class="list-item__content">
              <div class="item-preview">
                <img src="${info.payload}" />
              </div>
              <div class="item-info">
                <div class="item-name uic-text-ellipsis">
                  ${info.name}.${info.ext}
                </div>
              </div>
              <div class="item-control">
                <div class="item-status">
                  <!-- <span style="color: 'red'">下载失败</span> -->
                  <!-- <span>进度显示</span> -->
                </div>
              </div>
            </div>
          </a>
        `;
        break;
      }
      case 'article': {
        const articleInfo = JSON.parse(base64.decode(info.payload));

        html = `
          <a
            href="javascript:;"
            target="_blank"
            class="uic-list__item"
            >
            <div class="list-item__content">
              <div class="item-info">
                <div class="item-name uic-text-ellipsis">
                  ${articleInfo.name}
                </div>
                <div class="item-desc uic-text-ellipsis">
                  ${articleInfo.description}
                </div>
              </div>
              <div class="item-control">
                <div class="item-status">
                  <!-- <span style="color: 'red'">下载失败</span> -->
                  <!-- <span>进度显示</span> -->
                </div>
              </div>
            </div>
          </a>
        `;
        break;
      }
      case 'file': {
        if (config.isLazyMode) {
          html = `
          <a
            href="javascript:;"
            target="_blank"
            download="${info.name}.${info.ext}"
            class="uic-list__item"
            >
            <div class="list-item__content">
              <div class="item-preview">
                <i class="iconfont icon-uic-cloud-dl"></i>
              </div>
              <div class="item-info">
                <div class="item-name uic-text-ellipsis">
                  ${info.name}.${info.ext}
                </div>
              </div>
              <div class="item-control">
                <div class="item-status">
                  <!-- <span style="color: 'red'">下载失败</span> -->
                  <!-- <span>进度显示</span> -->
                </div>
                <i class="iconfont icon-uic-right uic-hide"></i>
              </div>
            </div>
          </a>
        `;
        } else {
          html = `
          <a
            href="${info.payload}"
            target="_blank"
            download="${info.name}.${info.ext}"
            class="uic-list__item"
            >
            <div class="list-item__content">
              <div class="item-preview">
                <i class="iconfont icon-uic-file"></i>
              </div>
              <div class="item-info">
                <div class="item-name uic-text-ellipsis">
                  ${info.name}.${info.ext}
                </div>
              </div>
              <div class="item-control">
                <div class="item-status">
                  <!-- <span style="color: 'red'">下载失败</span> -->
                  <!-- <span>进度显示</span> -->
                </div>
                <i class="iconfont icon-uic-right"></i>
              </div>
            </div>
          </a>
        `;
        }

        break;
      }

      default: {
        throw new Error(
          `[data panel], Message type not recognized. type: ${info.type}`
        );
      }
    }

    return html;
  }

  /**
   * 设置下载状态
   * @param {*} type
   * @param {*} value
   */
  setStatus(type, value) {
    const item = this;
    const $elem = item.$elem;
    const config = item.config;
    const $status = $elem.find('.item-status');

    $status.empty();

    switch (type) {
      case 'load': {
        $status.html(`<small>${value}</small>`);
        config.isLoading = true;
        break;
      }

      case 'fail': {
        $status.html(`<small style="color: 'red'">error</small>`);
        config.isLoading = false;
        break;
      }

      case 'done': {
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
  _bindEvent_onItemClick() {
    const item = this;
    const $elem = item.$elem;

    $elem.on('click', function(event) {
      const config = item.config;

      if (item.config.type === 'image' && !store.isImageModalVisible) {
        const imagePreviewModal = new ImagePreviewModal({
          imgInfoList: item.dataList.imgInfoList,
          currentInfo: item.config.imgInfo
        }).render();

        store.imagePreviewModal = imagePreviewModal;
      }

      // 如果未处于懒加载模式或状态标志位显示已完成（done）
      // 就按类型触发相应点击事件
      if (!config.isLazyMode || config.status === 'done') {
        switch (config.type) {
          case 'article': {
            const pageName = `read_article_${store.getTagId()}`;

            store.nav
              .push(
                pageName,
                new ArticlePage({
                  info: config.info
                })
              )
              .navTo(pageName);
            break;
          }
          case 'image': {
            // 打开图片弹出层
            showImageModal(
              $elem
                .find('.item-preview')
                .find('img')
                .attr('src'),
              'data-list-page'
            );

            break;
          }

          case 'file': {
            // 判断后缀名是否为视频格式
            const isVideoExt = videoExtensions.includes(
              config.info.ext.toLowerCase()
            );

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

      let loading;

      // 如果当前列表项为文章类型，下载过程中弹出加载中效果，禁止用户进行其他操作
      if (item.config.type === 'article') {
        loading = new Loading({
          hasCloseBtn: true,
          onClosed: () => {
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
      const sliceConfig = {
        cm: store.clientMap.main,
        serverAddr: store.serverAddr,
        dataInfo: {
          // 指定期望消息数据在服务器中的纳秒级时间戳
          dataID: config.info.dataID,
          payloadLength: config.info.len
        }
      };

      sliceConfig.onProgress = (value, offset, limit, total) => {
        item.setStatus('load', `${((value / 1) * 100).toFixed(2)}%`);
        const imgInfo = item.config.imgInfo;

        imgInfo && imgInfo.onProgress && imgInfo.onProgress(value);
      };

      sliceConfig.onReceiveAll = dataUrl => {
        // console.log('item download', dataUrl);
        const imgInfo = item.config.imgInfo;

        imgInfo && imgInfo.onProgress && imgInfo.onProgress(1, dataUrl);

        const itemType = item.config.type;
        const info = item.config.info;

        item.setStatus('done');
        config.isLazyMode = false;
        info.dataUrl = dataUrl;

        // 如果消息详情中包含 dataID 字段，表示此消息数据支持缓存
        // 此处执行缓存操作
        if (info.hasOwnProperty('dataID')) {
          cacheMessageData(info.md5sum, dataUrl);
        }

        switch (itemType) {
          case 'image': {
            // 生成 blob URL
            const blob = dataURItoBlob(dataUrl);
            const blobURL = createBlobUrl(blob);

            $elem
              .find('.item-preview')
              .empty()
              .html(`<img src="${blobURL}" />`);

            // showImageModal(blobURL, 'data-list-page');
            break;
          }

          case 'article': {
            $elem
              .find('.icon-uic-cloud-dl')
              .removeClass('icon-uic-cloud-dl')
              .addClass('icon-uic-article');

            const pageName = `read_article_${store.getTagId()}`;

            if (store.currentArticleOpt.md5sum === config.info.md5sum) {
              store.currentArticleOpt.loading.remove();
              store.nav
                .push(
                  pageName,
                  new ArticlePage({
                    info: config.info
                  })
                )
                .navTo(pageName);
            }

            break;
          }

          case 'file': {
            // 生成 blob URL
            const blob = dataURItoBlob(dataUrl);
            const blobURL = createBlobUrl(blob);

            $elem
              .attr('href', blobURL)
              .find('.icon-uic-cloud-dl')
              .removeClass('icon-uic-cloud-dl')
              .addClass('icon-uic-file');

            $elem.find('.icon-uic-right').removeClass('uic-hide');

            break;
          }

          default:
            break;
        }
      };

      sliceConfig.onError = (sliceNum, error) => {
        console.log('onError', sliceNum, error);
        item.setStatus('fail');
      };

      // 初始化进度
      item.setStatus('load', '0%');

      // 创建并启动切片下载任务
      const sliceTask = new SliceTask(sliceConfig);
      sliceTask.start();
    });
  }
}

exports.DataListItem = DataListItem;
