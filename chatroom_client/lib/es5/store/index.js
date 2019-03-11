'use strict';

/**
 * 管理全局数据
 */

var localStore = require('store');

var _require = require('common.utils'),
    isMobile = _require.isMobile;

var store = {
  identifiers: {
    main: 'chatroom'
  },
  // 通讯模块客户端
  clientMap: {
    main: null
  },
  // 使用服务器收到消息时的纳秒级时间戳过滤重复消息
  messageTimeMap: {},
  // 默认配置项
  config: {
    // 通讯模块超时等待时间
    retryWaitMS: 60 * 1000,
    // 通讯模块超时重试次数
    retryCount: 3
  },
  // 用户信息
  user: {
    nickname: null,
    publicKey: null,
    privateKey: null
  },
  // 页面导航模块
  nav: null,
  // 缓存 Map
  cacheMap: {
    // 文件、图片、文章消息实体缓存，使用 md5 作为 map 的 key
    // cacheMap.msgData[articleMD5] = 'dataURL...';
    msgData: {}
  },
  // 本地存储组件
  localStore: localStore,
  // 全局唯一标记
  _tagId: 0,
  /**
   * 生成一个新的全局唯一 ID
   */
  getTagId: function getTagId() {
    this._tagId += 1;
    return this._tagId;
  },

  // 图片展示模态框是否处于可视状态
  isImageModalVisible: false,
  // 当前设备是否是移动端
  isMobile: isMobile()
};

window.store = store;

exports.store = store;