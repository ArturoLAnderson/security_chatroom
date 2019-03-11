const { BaseComponent } = require('common.ui-components/base');

const { store } = require('src/store');
const { cmSendMessage } = require('src/utils');
const { DataListItem } = require('./data-list-item');

/**
 * 从服务端获取数据列表
 */
function _getDataList(data, onResponse, onError) {
  const storeConfig = store.config;

  const opt = {
    toUser: store.serverAddr,
    data: JSON.stringify(data),
    needACK: true,
    needResponse: true,
    retryCount: storeConfig.retryCount,
    retryWaitMS: storeConfig.retryWaitMS,
    onSuccess: () => {},
    onError: err => {
      onError && onError(err);
    },
    onResponse: (src, payload) => {
      onResponse && onResponse(src, JSON.parse(payload));
    },
    responseID: 0
  };

  cmSendMessage(store.clientMap.main, opt);
}

/**
 * @class
 * 数据列表组件
 */
class DataList extends BaseComponent {
  /**
   * 数据列表组件
   * @param {Object} config
   * @example
   *
   * const config = {
   *   offset: 0       // 起始偏移量，默认为0，可留空
   *   limit: 100,     // 指定每次请求期望返回的数量
   *   type: 'article' // 列表类型，必填项，供选值：'article', 'file', 'image'
   * };
   * const articleList = new DataList(config);
   */
  constructor(config) {
    const defaultConfig = {
      // 在数据库中的偏移量，此时指消息在数据库中的 id
      offset: 0,
      // 每页请求数量
      limit: 30,
      // 总量
      total: 0,
      // 已加载数量
      loadCount: 0,
      // 当前获取列表的最大 dataID
      maxDataID: 0,
      // 当前列表类型
      type: null,
      // 列表是否正处于加载中状态
      isLoading: false,
      // 列表是否加载完毕
      isLoadDone: false,
      // 上一次搜索的值
      lastSearchVal: null,
      // 搜索请求唯一 ID，每次请求会增加这个值并绑定到这个请求
      // 如果返回数据的请求被标记的 searchId 和当前 searchId 的值不同
      // 就不渲染返回的数据
      searchId: 0
    };

    config = Object.assign(defaultConfig, config);

    if (!config.type) {
      throw new Error(
        '[DataList] invalid config type, legal values：article、file、image'
      );
    }
    super(config);

    // 图片信息列表
    this.imgInfoList = [];
  }

  create() {
    const _this = this;
    // 创建根元素
    const $elem = _this.createRootElem(`
      <div class="uic-list">
        <div class="uic-search-bar">
          <input type="text" class="input--search" placeholder="search..." />
        </div>
        <div class="inner">
          <!-- <div class="uic-list__item"></div> -->
        </div>

        <div class="loadmore-panel">
          <div style="display: inline-block;">
           <a href="javascript:;" class="btn--loadmore">loadmore</a>
          </div>
        </div>
      </div>
    `);

    // 创建获取更多按钮
    const $loadMore = $elem.find('.btn--loadmore');
    const $inner = $elem.children('.inner');
    const $search = $elem.find('.input--search');

    this.nodes.$loadMore = $loadMore;
    this.nodes.$inner = $inner;
    this.nodes.$search = $search;

    // 绑定获取更多事件
    $loadMore.on('click', function() {
      if (_this.config.isLoadDone) {
        return;
      }

      _this.loadMore();
    });

    let _searchHandler = null;
    // 是否正在使用输入法
    let _isCompositionMode = false;

    const searchElem = $search.get(0);

    searchElem.addEventListener('compositionstart', function() {
      _isCompositionMode = true;
    });
    searchElem.addEventListener('compositionend', function() {
      _isCompositionMode = false;
    });

    // 绑定搜索输入框 keyup 事件
    $search.on('keyup', function() {
      if (_isCompositionMode) {
        // 当前输入法正在拼写汉字，不需要触发事件
        return false;
      }

      // 输入框停止动作1秒后触发请求
      clearTimeout(_searchHandler);
      _searchHandler = setTimeout(() => {
        const $this = $(this);
        const val = $.trim($this.val());

        if (_this.config.lastSearchVal !== val) {
          _this.config.offset = 0;
        }

        _this.loadMore();
      }, 1000);
    });
  }

  onRendered() {
    // 当元素渲染完毕后为其绑定滚动事件
    this._bindEvent_onDataListScroll();
  }

  /**
   * 从服务器获取列表最新数据的 ID
   * 如果最新数据 ID 大于当前以获取的最大数据 ID
   * 就重新加载列表
   */
  reloadIfHasLastID() {
    const _this = this;
    const config = _this.config;
    const $loadMorePanel = _this.nodes.$loadMore.closest('.loadmore-panel');

    _this.loadStart();
    config.isLoading = false;
    _this.nodes.$inner.before($loadMorePanel);

    // 从服务器获取列表最新数据的 ID
    _getDataList(
      {
        cmd: 'GET_FILE_LIST',
        type: 'lastID',
        msg: {
          type: config.type
        }
      },
      (src, payload) => {
        // console.log('[reloadIfHasLastID]', payload, _this.config);

        if (payload.lastID) {
          // 如果最新数据 ID 大于当前以获取的最大数据 ID，就重新加载列表
          if (payload.lastID > config.maxDataID) {
            _this.reset();
            _this.loadMore(true);
          } else {
            if (_this.config.isLoadDone) {
              _this.loadNone();
            } else {
              _this.loadDone();
            }
          }
        } else {
          // 没有数据，修改界面提示为“没有更多了”
          _this.loadNone();
        }
      },
      err => {
        console.log(err);
      }
    );
  }

  /**
   * 添加用于展示图片的信息
   * @param {Object} imgInfo
   */
  addImgInfo(imgInfo) {
    const modal = store.imagePreviewModal;

    this.imgInfoList.push(imgInfo);
    modal && modal.refreshBtns();
  }

  /**
   * 添加列表项
   * @param {Array} infoList 从服务端请求回的数据列表
   * @param {Boolean} prepend 是否在列表前部插入
   */
  addItems(infoList, prepend = false) {
    const dataList = this;
    // 在内存中生成临时存储空间
    const $list = $('<div class="uic__temp-div" />');

    // 遍历消息配置列表，生成消息并添加到临时存储
    for (const _info of infoList) {
      // 创建数据列表项
      const _config = {
        dataList: dataList,
        info: _info,
        type: dataList.config.type
      };

      // 创建图片预览信息
      if (_config.type === 'image') {
        const imgInfo = {
          dataID: _info.dataID,
          md5sum: _info.md5sum,
          preview: _info.payload,
          payloadLength: _info.len,
          imgSrc: null
        };

        _config.imgInfo = imgInfo;

        dataList.addImgInfo(imgInfo);

        // 添加列表项回调函数
        _config.onCreated = item => {
          // 添加图片预览回调函数
          imgInfo.onPreview = () => {
            // 图片开始预览时，触发列表项点击事件，执行图片下载任务
            item.$elem.trigger('click');
          };
        };
      }

      // 生成列表项并渲染到页面中
      new DataListItem(_config).render($list);
    }

    // 将所有消息一次添加到浏览器中
    if (prepend) {
      // 从列表前插入新条目，用于更新数据
      $list.children().prependTo(this.nodes.$inner);
    } else {
      // 从列表后插入新条目，用于翻页
      $list.children().appendTo(this.nodes.$inner);
    }

    return this;
  }

  /**
   * 初始化列表
   */
  reset() {
    const config = this.config;

    config.searchId += 1;
    config.isLoading = false;
    config.offset = 0;
    this.nodes.$inner.empty();

    return this;
  }

  /**
   * 获取数据
   * 如果 isNewDataMode 为 true，
   * @param {Boolean} isNewDataMode 是否是获取新数据模式
   */
  loadMore(isNewDataMode = false) {
    const _this = this;
    const config = _this.config;

    if (config.isLoading) {
      return;
    }

    _this.loadStart();

    const msg = {
      type: config.type,
      offset: config.offset,
      count: config.limit,
      sort: 'desc'
    };

    const $loadMorePanel = _this.nodes.$loadMore.closest('.loadmore-panel');

    // 如果是获取最新数据模式，就将请求的 offset 重置为 0
    if (isNewDataMode) {
      msg.offset = 0;
      _this.nodes.$inner.before($loadMorePanel);
    }

    // console.log('[loadMore]', msg);

    const val = $.trim(_this.nodes.$search.val());

    // 设置搜索内容
    if (val.length > 0) {
      msg.search = val;
    }

    // 收到的数据数量
    let _receiveCount = 0;
    let _offset = config.offset;

    // 执行分片获取
    __sliceGet();

    /**
     * 分片获取列表
     *
     * 如需加载30条数据，每次请求3条数据并添加到页面中
     */
    function __sliceGet() {
      const opt = {
        cmd: 'GET_FILE_LIST',
        type: 'list',
        msg: {
          type: config.type,
          offset: _offset,
          count: 3,
          sort: 'desc'
        }
      };

      // 记录当前搜索发出 Request 的编号
      config.searchId += 1;
      const sid = config.searchId;

      if (val.length > 0) {
        opt.msg.search = val;
      }

      const onResponse = (src, payload) => {
        // console.log('[GET_FILE_LIST]', payload);
        const _list = payload.list;

        _receiveCount += _list.length;

        // 收到服务器返回的数据后如果和当前编号不一致
        // 就不进行渲染
        if (sid === config.searchId) {
          // offset 为0，即为重新获取列表，此时需重置列表
          if (config.offset === 0) {
            _this.reset();

            if (_list.length > 0) {
              // 更新已加载最大数据 ID
              config.maxDataID = _list[0]['dataID'];
            }
          }

          config.total = payload.total;
          _this.addItems(_list);

          if (_list.length > 0) {
            // 累计已加载数量
            config.loadCount += _list.length;
            // 更新 offset 为此次请求回的最后一条数据的 dataID
            const lastDataID = _list[_list.length - 1]['dataID'];

            config.offset = lastDataID;
          }
        } else {
          return false;
        }

        // 一组数据获取完毕或者已经没有数据
        if (_receiveCount >= config.limit || _list.length === 0) {
          // searchId 和 config 中的 searchId 不一致，不进行渲染
          _this.loadDone();

          // 如果已加载数量等于列表总量，表示列表加载完毕
          if (config.loadCount >= config.total) {
            _this.loadNone();
          }
        } else {
          // 更新临时 _offset 收到数据列表的最后一条的 dataID
          _offset = _list[_list.length - 1]['dataID'];
          // 继续获取数据
          __sliceGet();
        }
      };

      const onError = err => {
        console.log(err);
        _this.loadDone();
      };

      _getDataList(opt, onResponse, onError);
    }
  }

  /**
   * 开始加载数据
   */
  loadStart() {
    const $loadMore = this.nodes.$loadMore;
    this.config.isLoading = true;
    $loadMore
      .empty()
      .html('<i style="font-size: 30px;" class="iconfont icon-uic-load"></i>')
      .css('cursor', 'default')
      .parent()
      .addClass('uic-rotation');
  }

  /**
   * 数据加载完成
   */
  loadDone() {
    const $loadMore = this.nodes.$loadMore;
    this.config.isLoading = false;
    this.nodes.$inner.after($loadMore.closest('.loadmore-panel'));
    $loadMore
      .empty()
      .html('loadmore')
      .css('cursor', 'pointer')
      .parent()
      .removeClass('uic-rotation');
  }

  /**
   * 没有更多数据
   */
  loadNone() {
    const $loadMore = this.nodes.$loadMore;
    this.config.isLoading = false;
    this.config.isLoadDone = true;
    this.nodes.$inner.after($loadMore.closest('.loadmore-panel'));

    $loadMore
      .empty()
      .html('done')
      .css('cursor', 'default')
      .parent()
      .removeClass('uic-rotation');
  }

  /**
   * 绑定数据列表滚动事件
   */
  _bindEvent_onDataListScroll() {
    const $elem = this.$elem;
    const $panel = $elem.parent();

    // 绑定滚动事件
    $panel.on('scroll', () => {
      // 滚动到列表底部时触发加载更多事件
      if (__isScrollEnd() && !this.config.isLoadDone) {
        this.loadMore();
      }
    });

    /**
     * 判断是否滚动到了列表底部
     *
     * 如果面板高度+面板 scrollTop 等于列表高度，表示已经滚动到最底部
     */
    function __isScrollEnd() {
      return $panel.scrollTop() + $panel.height() === $elem.height();
    }
  }
}

exports.DataList = DataList;
