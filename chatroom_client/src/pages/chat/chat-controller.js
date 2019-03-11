/**
 * Chat 页面逻辑
 */

const { store } = require('src/store');
const { cmSendMessage } = require('src/utils');

const { getChatPageServerAddr } = require('./utils');

/**
 * 发送消息
 *
 * 从 item.config 中取出需要发送的消息，通过通讯模块发送给服务器
 * @param {MessageItem} item MessageItem 组件实例
 */
function sendMessage(item) {
  const config = item.config;

  // 构建消息 payload
  const payload = {
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
  const serverAddr = getChatPageServerAddr(item);

  // 将 object 转换为 JSON 字符串
  const data = JSON.stringify(payload);
  // 构建通讯模块发送配置
  const opt = {
    toUser: serverAddr,
    data: data,
    needACK: true,
    needResponse: false,
    retryCount: store.retryCount,
    onSuccess: () => {
      // 发送消息成功
      item.setStatus('done');
    },
    onError: err => {
      // 发送消息失败
      console.log('onError send', err);
      item.setStatus('fail');
    },
    onResponse: null,
    responseID: 0,
    onProgress: progress => {
      // 更新发送进度
      item.setStatus('load', `${((progress / 1) * 100).toFixed(2)}%`);
    }
  };

  cmSendMessage(store.clientMap.main, opt);
}

exports.sendMessage = sendMessage;
