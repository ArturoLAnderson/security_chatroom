const { CommunicateModule } = require('common.communicate/communicate');
const { Loading } = require('common.ui-components/loading');

const { store } = require('src/store');
const { LoginPage } = require('src/pages/login/login');
const { ChatPage } = require('src/pages/chat/chat');
const { sendJoinRoomRequest, updateRoomTitile } = require('src/utils');
const { getMessageItemConfig } = require('src/pages/chat/message-configs');
const { resetOfflineChecker } = require('src/pages/chat/utils/check-offline');

function initDependents() {
  if (store.isMobile) {
    // 移动端页面适配
    require('amfe-flexible');
  }
  require('jquery-circle-progress');
  // 项目样式文件
  require('./style.js');
}

exports.initDependents = initDependents;

/**
 * 创建包含聊天室模块的导航面板
 * @param {Nav} nav 导航组件实例
 * @param {String} serverPublicKey 灯塔公钥
 * @param {String} serverAddr 灯塔地址（指定identifier.灯塔公钥）
 */
function createNavPanel(nav, serverPublicKey, serverAddr) {
  // 生成聊天页面
  const chatPage = new ChatPage({
    title: 'chatroom',
    serverPublicKey: serverPublicKey,
    serverAddr: serverAddr
  });

  nav.push('chat_page', chatPage);

  // 生成登录页面
  const loginPage = new LoginPage({
    /**
     * 登录表单提交回调函数
     * @param {Object} data 表单数据
     */
    onSubmit: data => {
      login(data);
    }
  });
  // 将“登录页面”添加到导航列表
  nav.push('login_page', loginPage).navTo('login_page');
}

exports.createNavPanel = createNavPanel;

/**
 * 连接到 NKN
 */
function connectNKN() {
  console.log('connectNKN');

  // 创建“加载中”提示
  const loading = new Loading({
    text: 'Connecting network...'
  });

  loading.render('#app');

  // 请求连接计数
  let connectId = 1;

  // 执行连接函数
  __doConnect();

  /**
   * 执行连接
   */
  function __doConnect() {
    const _connectId = connectId;
    // 运行检测函数
    _nknFetchFailDetector(() => {
      __onError();
    });

    // 创建通讯模块实例
    createCMClient(
      cm => {
        // 该通讯模块实例请求 id 与当前 connectId 不同
        // 表示该连接为超时连接
        // 关闭该 NKN client，并返回
        if (_connectId !== connectId) {
          cm.client.close();
          return false;
        }
        // onSuccess
        loading.remove(1000);
      },
      () => {
        __onError();
      }
    );
  }

  /**
   * 连接失败回调
   */
  function __onError() {
    // 更新提示信息
    loading.updateText(`Connecting network, retry ${connectId++}`);
    // 重试连接
    __doConnect();
  }
}

exports.connectNKN = connectNKN;

/**
 * 获取用户登录状态
 */
function isUserLogged() {
  return !!store.user && !!store.user.nickname;
}

exports.isUserLogged = isUserLogged;

/**
 * 登录聊天室
 * @param {Object} options
 *
 * @example
 * const options = {
 *   nickname: '昵称',
 *   joinReason: '加入理由'
 * };
 * login(options);
 */
function login(options) {
  const key = store.clientMap.main.getClientKey();

  store.user = {
    nickname: options.nickname,
    joinReason: options.joinReason,
    publicKey: key.publicKey,
    privateKey: key.privateKey
  };

  // 将用户数据存储到浏览器 localstorage
  setUser(store.user);
  // 加入聊天室
  _joinRoom();
}

exports.login = login;

/**
 * 创建通讯模块（CommunicateModule）实例，连接 NKN 服务器
 */
function createCMClient(onSuccess, onError) {
  const cm = new CommunicateModule();
  store.clientMap.main = cm;

  const opt = {
    identifier: store.identifiers.main,
    seedRpcServerAddr: 'http://knowbb.io:30003',
    retryCount: 10000,
    retryWaitMS: 100,
    onSuccess: () => {
      // 绑定通讯模块接收消息回调函数
      cm.reviceMessage(function(
        src,
        id,
        payload,
        needResponse,
        offset,
        count,
        total
      ) {
        cmOnRecv(src, JSON.parse(payload));
      });

      onSuccess && onSuccess(cm);
    },
    onError: () => {
      onError && onError();
    },
    privateKey: null
  };

  if (store.user && store.user.privateKey) {
    opt.privateKey = store.user.privateKey;
  }

  try {
    cm.createClient(
      opt.identifier,
      opt.retryCount,
      opt.retryWaitMS,
      opt.onSuccess,
      opt.onError,
      opt.privateKey,
      opt.seedRpcServerAddr
    );
  } catch (error) {
    console.log('[createCMClient] createClient', error);
  }
}

exports.createCMClient = createCMClient;

/**
 * 处理通过通讯模块接收到的消息
 */
function cmOnRecv(src, payload) {
  console.log('imGroupOnRecv', src, payload);
  __dispatch(payload);

  function __dispatch(payload) {
    switch (payload.cmd) {
      case 'ROOM_INFO': {
        updateRoomTitile(payload.msg.room.title);
        break;
      }
      // 收到未读消息
      case 'UNREAD_MESSAGE': {
        // 如果消息数量为 0 或服务端地址不是当前所属聊天室的服务端地址时
        // 不进行消息的渲染
        if (payload.msg.length === 0 || src !== store.serverAddr) {
          return;
        }

        const configList = [];
        const chatPage = store.nav.getPage('chat_page');

        for (let _p of payload.msg) {
          const _msg = _p.msg;

          // 过滤重复消息
          if (store.messageTimeMap[_msg.serverTimestamp]) {
            continue;
          }

          // 设置消息标志位
          store.messageTimeMap[_msg.serverTimestamp] = 1;

          // 生成新消息配置项
          const _config = getMessageItemConfig({
            pos: 'left',
            user: _msg.user,
            message: _msg.message,
            timestamp: _msg.timestamp,
            serverTimestamp: _msg.serverTimestamp
          });

          // 如果是图片类型消息，就缓存用于预览的图片信息
          if (_msg.message.type === 'image') {
            const msgInfo = _msg.message.info;
            const imgInfo = {
              dataID: msgInfo.dataID,
              md5sum: msgInfo.md5sum,
              preview: msgInfo.dataUrl,
              payloadLength: msgInfo.len,
              imgSrc: null
            };

            _config.imgInfo = imgInfo;

            // 添加消息元素创建完毕回调函数
            _config.onCreated.push(item => {
              // 添加图片预览回调函数
              imgInfo.onPreview = imgSrc => {
                // 图片呗预览时触发图片消息的点击事件，此时会触发消息的下载任务
                item.$elem.find('.item-message--image').trigger('click');
              };
            });

            // 将图片预览信息添加到相应聊天页面的“预览图片列表”中
            chatPage.addImgInfo(imgInfo);
          }

          configList.push(_config);
        }

        const chatPanel = chatPage.chatPanel;
        const domMessagePanel = chatPanel.messagePanel.$elem.get(0);
        const isReadingMode =
          domMessagePanel.scrollTop + domMessagePanel.clientHeight + 100 <
          domMessagePanel.scrollHeight;

        chatPanel.addMessages(configList);

        // 如果用户正在浏览其他消息，就显示“新消息提示”，否则消息面板滚动到底部
        if (isReadingMode) {
          chatPanel.editor.nodes.$editorTip.removeClass('uic-hide');
        } else {
          chatPanel.scrollToBottom();
        }

        // 重置离线检查器
        resetOfflineChecker(chatPanel);

        break;
      }
      default: {
        console.log('[UNREAD_MESSAGE] Unrecognized Payload CMD');

        break;
      }
    }
  }
}

exports.cmOnRecv = cmOnRecv;

/**
 * 从本地存储获取 user object
 */
function getUser() {
  return store.localStore.get('user');
}

exports.getUser = getUser;

/**
 * 向本地存储插入 user object
 */
function setUser(user) {
  store.localStore.set('user', user);
}

exports.setUser = setUser;

/**
 * 发送加入聊天室请求
 */
function _joinRoom() {
  const loading = new Loading({
    text: 'Join chatroom...'
  });
  loading.render('#app');

  __checkJoinStatusLoop();

  /**
   * 循环发送 ROOM_JOIN 请求，被批准加入聊天室后才可进入聊天页面
   */
  function __checkJoinStatusLoop() {
    sendJoinRoomRequest(
      (src, payload) => {
        // onResponse
        console.log('[_joinRoom]', src, payload);

        const msg = payload.msg;
        const nav = store.nav;

        // 更新聊天室标题
        updateRoomTitile(msg.room.title);

        // 用户在黑名单中
        if (msg.userStatus === 'blacklist') {
          console.log('in blacklist');
          alert('Join failed, you have been banned.');
          loading.remove();

          return false;
        }

        if (msg.joinedStatus === 'wait') {
          // 等待加入请求被批准
          loading.updateText('Waiting for approval...');

          // 十秒后再次发送请求
          setTimeout(() => {
            __checkJoinStatusLoop();
          }, 10 * 1000);
        } else {
          // 加入成功

          // 更新当前聊天室加入状态
          store.localStore.set(`${store.serverPublicKey}:joined`, true);
          // 导航到聊天页面
          nav.navTo('chat_page');
          // 重置离线检查器
          resetOfflineChecker(nav.getPage('chat_page').chatPanel);
          // 移除“加载中”模态框
          loading.remove();
        }
      },
      () => {
        // onError
        loading.remove();
        alert('Join failed. Please retry.');
      }
    );
  }
}

/**
 * 5 秒后检测是否成功创建了 Websocket 服务
 * 如果创建失败，则认定连接 NKN 节点失败
 * @param {Function} onError
 */
function _nknFetchFailDetector(onError) {
  // 开启定时器，5秒后触发检测
  setTimeout(() => {
    const client = store.clientMap.main.client;

    // 检测 Websocket 服务状态
    if (!client || !client.ws) {
      // 释放创建失败的通讯模块实例
      store.clientMap.main = null;

      onError && onError();
    }
  }, 5 * 1000);
}

/**
 * 检测当前平台是 PC 端和是移动端，添加相应 css class
 */
function addPlatformClass() {
  const $body = $('body');

  if (store.isMobile) {
    $body.addClass('platform-mobile');
  } else {
    $body.addClass('platform-pc');
  }
}

exports.addPlatformClass = addPlatformClass;
