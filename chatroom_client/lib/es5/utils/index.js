'use strict';

/**
 * 供整个项目使用的函数
 */

var _require = require('common.utils'),
    calcRetryTime = _require.calcRetryTime;

var moment = require('moment');

var _require2 = require('common.ui-components/modal'),
    Modal = _require2.Modal;

var _require3 = require('../store'),
    store = _require3.store;

/**
 * 发送消息给客户端
 * @param options 通讯模块参数对象
 */


function cmSendMessage(cm, option) {
  if (!option.retryWaitMS) {
    option.retryWaitMS = calcRetryTime(option.data);
  }

  cm.sendMessage(option.toUser, option.data, option.needACK, option.needResponse, option.retryCount, option.retryWaitMS, option.onSuccess, option.onError, option.onResponse, option.responseID, option.onProgress);
}

exports.cmSendMessage = cmSendMessage;

/**
 * 加载服务器公钥
 */
function loadServerPublicKey() {
  var result = location.search.match('server=([a-fA-F0-9]{66})');

  if (!result) {
    alert('聊天室地址不正确，无法获取服务器地址');
    throw new Error('聊天室地址不正确，无法获取服务器地址');
  }

  var publicKey = result[1];

  if (publicKey.length !== 66) {
    alert('聊天室地址不正确，服务器地址长度不合法');
    throw new Error('聊天室地址不正确，服务器地址长度不合法');
  }

  return publicKey;
}

exports.loadServerPublicKey = loadServerPublicKey;

/**
 * 格式化消息时间戳为日期字符串
 * @param {Number} timestamp
 */
function formatMessageTimestamp(timestamp) {
  var datetime = void 0;

  if (moment(timestamp).isBefore(moment(), 'day')) {
    // 如果历史消息时间不是今天就显示月、日信息
    datetime = moment(timestamp).format('MM-DD HH:mm:ss');
  } else {
    datetime = moment(timestamp).format('HH:mm:ss');
  }

  return datetime;
}

exports.formatMessageTimestamp = formatMessageTimestamp;

/**
 * 展示图片模态框
 *
 * 全局仅允许显示一个
 * @param {*} src 图片 URL
 */
function showImageModal(src, pageName) {
  if (store.isImageModalVisible || pageName && pageName !== store.nav.currentPageName) {
    return;
  }

  var modal = new Modal({
    showBackdrop: true,
    body: '\n      <div class="uic-preview-wrapper">\n        <div class="uic-preview-body">\n          <image\n            src="' + src + '"\n          >\n        </div>\n      </div>\n    ',
    beforeCreate: function beforeCreate() {
      store.isImageModalVisible = true;
    },
    onClosed: function onClosed() {
      store.isImageModalVisible = false;
    }
  });

  modal.render('body');
}

exports.showImageModal = showImageModal;

/**
 * 加入聊天室
 * @param {*} onResponse
 * @param {*} onError
 */
function sendJoinRoomRequest(_onResponse, _onError) {
  var _joind = false;

  console.log('[sendJoinRoomRequest]', {
    cmd: 'ROOM_JOIN',
    msg: {
      reason: store.user.joinReason
    }
  });

  var opt = {
    toUser: store.serverAddr,
    data: JSON.stringify({
      cmd: 'ROOM_JOIN',
      msg: {
        reason: store.user.joinReason
      }
    }),
    needACK: true,
    needResponse: true,
    retryCount: store.config.retryCount,
    retryWaitMS: 20000,
    onSuccess: function onSuccess() {},
    onError: function onError(err) {
      if (_joind) {
        // 如果已经成功收到 Response，就不触发 onError
        return;
      }
      console.log('加入聊天室失败，onError', err, new Date());
      _onError && _onError();
    },
    onResponse: function onResponse(src, payload) {
      _joind = true;
      _onResponse && _onResponse(src, JSON.parse(payload));
    },
    responseID: 0
  };

  cmSendMessage(store.clientMap.main, opt);
}

exports.sendJoinRoomRequest = sendJoinRoomRequest;

/**
 * 更新聊天室标题
 * @param {*} title
 */
function updateRoomTitile(title) {
  store.nav.getPage('chat_page').updateTitle(store.user.nickname + '@' + title);
  document.title = title;
}

exports.updateRoomTitile = updateRoomTitile;

/**
 * 绑定后退按钮事件
 * @param {*} $elem
 */
function bindNavBackEvent($elem) {
  $elem.find('[data-control="back"]').on('click', function () {
    store.nav.back();
  });
}

exports.bindNavBackEvent = bindNavBackEvent;

function getDefaultGIFDataURL() {
  return 'data:img/jpg;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABIklEQVRoQ+2YOwrCUBBFT0BQtyE2LsZWXIl7cCGWdu7Fym2IgoUEIqR5SWbm5Yc3lZ/MJPecyXtiwcyPYub3jwKMbVAGZCBIQCMUBBgul4EwwmADGQgCDJfLQBhhsIEMBAGGy//KwB44A7sEtjtwAm7V92vgWb1+AeX78qh/njJQP7/RksXAA9i0OC/P2U41QEll2RIgRXoSBuoBVsC7JUyXEeo8KqlrWUZIATo+xBaopn8lUgaso9K2CilA09r8W4XqD3HEwGgPcZcNyBrM9bPCMm99bGSDGjgAF2CRQPUBjsDVsBMPGsCluO8iywj1fS+u/grgwpaxSAYywnS1kgEXtoxFMpARpquVDLiwZSySgYwwXa1kwIUtY5EMZITpavUF8kBNMb81ev0AAAAASUVORK5CYII=';
}

exports.getDefaultGIFDataURL = getDefaultGIFDataURL;

/**
 * 缓存消息数据
 * @param {String} type
 * @param {String} md5sum
 * @param {String} dataUrl
 */
function cacheMessageData(md5sum, dataUrl) {
  var msgDataCacheMap = store.cacheMap.msgData;

  // 如果已经缓存过此 md5sum 的数据，就不执行缓存
  if (msgDataCacheMap.hasOwnProperty(md5sum)) {
    return;
  }

  // 缓存消息数据
  msgDataCacheMap[md5sum] = dataUrl;
}

exports.cacheMessageData = cacheMessageData;

function getMessageDataCache(md5sum) {
  var msgDataCacheMap = store.cacheMap.msgData;

  if (msgDataCacheMap.hasOwnProperty(md5sum)) {
    return msgDataCacheMap[md5sum];
  } else {
    console.log('[getMessageDataCache]', 'md5sum 不存在', md5sum);
    return null;
  }
}

exports.getMessageDataCache = getMessageDataCache;

/**
 * 判断指定消息内的文件、图片、文章数据是否有本地缓存
 * @param {Object} messageInfo 聊天消息内的 info 对象
 */
function hasMessageCache(messageInfo) {
  var msgDataCacheMap = store.cacheMap.msgData;

  // 根据 info 内是否包含 dataID 字段且本地缓存中包含此 dataID 的数据判断
  var hasCache = messageInfo.hasOwnProperty('dataID') && msgDataCacheMap.hasOwnProperty(messageInfo.md5sum);

  return hasCache;
}

exports.hasMessageCache = hasMessageCache;

/**
 * 根据 md5 查找是否缓存了相关数据
 * @param {String} md5sum
 */
function hasDataCacheByMD5(md5sum) {
  var msgDataCacheMap = store.cacheMap.msgData;

  // 根据 info 内是否包含 md5sum 字段且本地缓存中包含此 md5sum 的数据判断
  var hasCache = msgDataCacheMap.hasOwnProperty(md5sum);

  return hasCache;
}

exports.hasDataCacheByMD5 = hasDataCacheByMD5;

var throttle = function throttle(fn, delay, mustRunDelay) {
  var timer = null;
  var t_start;

  return function () {
    var context = this,
        args = arguments,
        t_curr = +new Date();
    clearTimeout(timer);
    if (!t_start) {
      t_start = t_curr;
    }
    if (t_curr - t_start >= mustRunDelay) {
      fn.apply(context, args);
      t_start = t_curr;
    } else {
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    }
  };
};

exports.throttle = throttle;