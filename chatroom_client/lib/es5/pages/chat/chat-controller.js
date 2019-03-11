'use strict';

/**
 * Chat 页面逻辑
 */

var _require = require('../../store'),
    store = _require.store;

var _require2 = require('../../utils'),
    cmSendMessage = _require2.cmSendMessage;

var _require3 = require('./utils'),
    getChatPageServerAddr = _require3.getChatPageServerAddr;

/**
 * 发送消息
 *
 * 从 item.config 中取出需要发送的消息，通过通讯模块发送给服务器
 * @param {MessageItem} item MessageItem 组件实例
 */


function sendMessage(item) {
  var config = item.config;

  // 构建消息 payload
  var payload = {
    cmd: 'NEW_MESSAGE'
  };

  payload.msg = {
    user: {
      nickname: store.user.nickname,
      publicKey: store.user.publicKey
    },
    message: config.message
  };

  // 设置发送时间
  payload.msg.timestamp = config.timestamp;

  // 初始化发送状态
  item.setStatus('load', '0%');
  // 从 chatPage 获取灯塔的地址
  var serverAddr = getChatPageServerAddr(item);

  // 将 object 转换为 JSON 字符串
  var data = JSON.stringify(payload);
  // 构建通讯模块发送配置
  var opt = {
    toUser: serverAddr,
    data: data,
    needACK: true,
    needResponse: false,
    retryCount: store.retryCount,
    onSuccess: function onSuccess() {
      // 发送消息成功
      item.setStatus('done');
    },
    onError: function onError(err) {
      // 发送消息失败
      console.log('onError send', err);
      item.setStatus('fail');
    },
    onResponse: null,
    responseID: 0,
    onProgress: function onProgress(progress) {
      // 更新发送进度
      item.setStatus('load', (progress / 1 * 100).toFixed(2) + '%');
    }
  };

  cmSendMessage(store.clientMap.main, opt);
}

exports.sendMessage = sendMessage;