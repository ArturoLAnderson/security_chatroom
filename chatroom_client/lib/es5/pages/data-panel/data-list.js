'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('../../store'),
    store = _require2.store;

var _require3 = require('../../utils'),
    cmSendMessage = _require3.cmSendMessage;

var _require4 = require('./data-list-item'),
    DataListItem = _require4.DataListItem;

/**
 * 从服务端获取数据列表
 */


function _getDataList(data, _onResponse, _onError) {
  var storeConfig = store.config;

  var opt = {
    toUser: store.serverAddr,
    data: JSON.stringify(data),
    needACK: true,
    needResponse: true,
    retryCount: storeConfig.retryCount,
    retryWaitMS: storeConfig.retryWaitMS,
    onSuccess: function onSuccess() {},
    onError: function onError(err) {
      _onError && _onError(err);
    },
    onResponse: function onResponse(src, payload) {
      _onResponse && _onResponse(src, JSON.parse(payload));
    },
    responseID: 0
  };

  cmSendMessage(store.clientMap.main, opt);
}

/**
 * @class
 * 数据列表组件
 */

var DataList = function (_BaseComponent) {
  _inherits(DataList, _BaseComponent);

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
  function DataList(config) {
    _classCallCheck(this, DataList);

    var defaultConfig = {
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
      throw new Error('[DataList] invalid config type, legal values：article、file、image');
    }

    // 图片信息列表
    var _this2 = _possibleConstructorReturn(this, (DataList.__proto__ || Object.getPrototypeOf(DataList)).call(this, config));

    _this2.imgInfoList = [];
    return _this2;
  }

  _createClass(DataList, [{
    key: 'create',
    value: function create() {
      var _this = this;
      // 创建根元素
      var $elem = _this.createRootElem('\n      <div class="uic-list">\n        <div class="uic-search-bar">\n          <input type="text" class="input--search" placeholder="search..." />\n        </div>\n        <div class="inner">\n          <!-- <div class="uic-list__item"></div> -->\n        </div>\n\n        <div class="loadmore-panel">\n          <div style="display: inline-block;">\n           <a href="javascript:;" class="btn--loadmore">loadmore</a>\n          </div>\n        </div>\n      </div>\n    ');

      // 创建获取更多按钮
      var $loadMore = $elem.find('.btn--loadmore');
      var $inner = $elem.children('.inner');
      var $search = $elem.find('.input--search');

      this.nodes.$loadMore = $loadMore;
      this.nodes.$inner = $inner;
      this.nodes.$search = $search;

      // 绑定获取更多事件
      $loadMore.on('click', function () {
        if (_this.config.isLoadDone) {
          return;
        }

        _this.loadMore();
      });

      var _searchHandler = null;
      // 是否正在使用输入法
      var _isCompositionMode = false;

      var searchElem = $search.get(0);

      searchElem.addEventListener('compositionstart', function () {
        _isCompositionMode = true;
      });
      searchElem.addEventListener('compositionend', function () {
        _isCompositionMode = false;
      });

      // 绑定搜索输入框 keyup 事件
      $search.on('keyup', function () {
        var _this3 = this;

        if (_isCompositionMode) {
          // 当前输入法正在拼写汉字，不需要触发事件
          return false;
        }

        // 输入框停止动作1秒后触发请求
        clearTimeout(_searchHandler);
        _searchHandler = setTimeout(function () {
          var $this = $(_this3);
          var val = $.trim($this.val());

          if (_this.config.lastSearchVal !== val) {
            _this.config.offset = 0;
          }

          _this.loadMore();
        }, 1000);
      });
    }
  }, {
    key: 'onRendered',
    value: function onRendered() {
      // 当元素渲染完毕后为其绑定滚动事件
      this._bindEvent_onDataListScroll();
    }

    /**
     * 从服务器获取列表最新数据的 ID
     * 如果最新数据 ID 大于当前以获取的最大数据 ID
     * 就重新加载列表
     */

  }, {
    key: 'reloadIfHasLastID',
    value: function reloadIfHasLastID() {
      var _this = this;
      var config = _this.config;
      var $loadMorePanel = _this.nodes.$loadMore.closest('.loadmore-panel');

      _this.loadStart();
      config.isLoading = false;
      _this.nodes.$inner.before($loadMorePanel);

      // 从服务器获取列表最新数据的 ID
      _getDataList({
        cmd: 'GET_FILE_LIST',
        type: 'lastID',
        msg: {
          type: config.type
        }
      }, function (src, payload) {
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
      }, function (err) {
        console.log(err);
      });
    }

    /**
     * 添加用于展示图片的信息
     * @param {Object} imgInfo
     */

  }, {
    key: 'addImgInfo',
    value: function addImgInfo(imgInfo) {
      var modal = store.imagePreviewModal;

      this.imgInfoList.push(imgInfo);
      modal && modal.refreshBtns();
    }

    /**
     * 添加列表项
     * @param {Array} infoList 从服务端请求回的数据列表
     * @param {Boolean} prepend 是否在列表前部插入
     */

  }, {
    key: 'addItems',
    value: function addItems(infoList) {
      var prepend = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      var dataList = this;
      // 在内存中生成临时存储空间
      var $list = $('<div class="uic__temp-div" />');

      // 遍历消息配置列表，生成消息并添加到临时存储
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = infoList[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _info = _step.value;

          // 创建数据列表项
          var _config = {
            dataList: dataList,
            info: _info,
            type: dataList.config.type
          };

          // 创建图片预览信息
          if (_config.type === 'image') {
            (function () {
              var imgInfo = {
                dataID: _info.dataID,
                md5sum: _info.md5sum,
                preview: _info.payload,
                payloadLength: _info.len,
                imgSrc: null
              };

              _config.imgInfo = imgInfo;

              dataList.addImgInfo(imgInfo);

              // 添加列表项回调函数
              _config.onCreated = function (item) {
                // 添加图片预览回调函数
                imgInfo.onPreview = function () {
                  // 图片开始预览时，触发列表项点击事件，执行图片下载任务
                  item.$elem.trigger('click');
                };
              };
            })();
          }

          // 生成列表项并渲染到页面中
          new DataListItem(_config).render($list);
        }

        // 将所有消息一次添加到浏览器中
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

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

  }, {
    key: 'reset',
    value: function reset() {
      var config = this.config;

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

  }, {
    key: 'loadMore',
    value: function loadMore() {
      var isNewDataMode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      var _this = this;
      var config = _this.config;

      if (config.isLoading) {
        return;
      }

      _this.loadStart();

      var msg = {
        type: config.type,
        offset: config.offset,
        count: config.limit,
        sort: 'desc'
      };

      var $loadMorePanel = _this.nodes.$loadMore.closest('.loadmore-panel');

      // 如果是获取最新数据模式，就将请求的 offset 重置为 0
      if (isNewDataMode) {
        msg.offset = 0;
        _this.nodes.$inner.before($loadMorePanel);
      }

      // console.log('[loadMore]', msg);

      var val = $.trim(_this.nodes.$search.val());

      // 设置搜索内容
      if (val.length > 0) {
        msg.search = val;
      }

      // 收到的数据数量
      var _receiveCount = 0;
      var _offset = config.offset;

      // 执行分片获取
      __sliceGet();

      /**
       * 分片获取列表
       *
       * 如需加载30条数据，每次请求3条数据并添加到页面中
       */
      function __sliceGet() {
        var opt = {
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
        var sid = config.searchId;

        if (val.length > 0) {
          opt.msg.search = val;
        }

        var onResponse = function onResponse(src, payload) {
          // console.log('[GET_FILE_LIST]', payload);
          var _list = payload.list;

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
              var lastDataID = _list[_list.length - 1]['dataID'];

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

        var onError = function onError(err) {
          console.log(err);
          _this.loadDone();
        };

        _getDataList(opt, onResponse, onError);
      }
    }

    /**
     * 开始加载数据
     */

  }, {
    key: 'loadStart',
    value: function loadStart() {
      var $loadMore = this.nodes.$loadMore;
      this.config.isLoading = true;
      $loadMore.empty().html('<i style="font-size: 30px;" class="iconfont icon-uic-load"></i>').css('cursor', 'default').parent().addClass('uic-rotation');
    }

    /**
     * 数据加载完成
     */

  }, {
    key: 'loadDone',
    value: function loadDone() {
      var $loadMore = this.nodes.$loadMore;
      this.config.isLoading = false;
      this.nodes.$inner.after($loadMore.closest('.loadmore-panel'));
      $loadMore.empty().html('loadmore').css('cursor', 'pointer').parent().removeClass('uic-rotation');
    }

    /**
     * 没有更多数据
     */

  }, {
    key: 'loadNone',
    value: function loadNone() {
      var $loadMore = this.nodes.$loadMore;
      this.config.isLoading = false;
      this.config.isLoadDone = true;
      this.nodes.$inner.after($loadMore.closest('.loadmore-panel'));

      $loadMore.empty().html('done').css('cursor', 'default').parent().removeClass('uic-rotation');
    }

    /**
     * 绑定数据列表滚动事件
     */

  }, {
    key: '_bindEvent_onDataListScroll',
    value: function _bindEvent_onDataListScroll() {
      var _this4 = this;

      var $elem = this.$elem;
      var $panel = $elem.parent();

      // 绑定滚动事件
      $panel.on('scroll', function () {
        // 滚动到列表底部时触发加载更多事件
        if (__isScrollEnd() && !_this4.config.isLoadDone) {
          _this4.loadMore();
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
  }]);

  return DataList;
}(BaseComponent);

exports.DataList = DataList;