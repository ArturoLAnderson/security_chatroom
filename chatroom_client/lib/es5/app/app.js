'use strict';

/**
 * APP 入口
 */

var moment = require('moment');

var _require = require('common.ui-components/nav'),
    Nav = _require.Nav;

var _require2 = require('../store'),
    store = _require2.store;

var _require3 = require('../utils'),
    loadServerPublicKey = _require3.loadServerPublicKey;

var _require4 = require('./app-controller'),
    createNavPanel = _require4.createNavPanel,
    connectNKN = _require4.connectNKN,
    initDependents = _require4.initDependents,
    getUser = _require4.getUser,
    addPlatformClass = _require4.addPlatformClass;

initDependents();
runApp();

function runApp() {
  // 初始化日期处理组件
  moment.locale('zh-cn');

  // 添加当前平台 css class
  addPlatformClass();

  // 从 URL 中获取服务器公钥
  store.serverPublicKey = loadServerPublicKey();
  // 生成供 NKN Client 消息收发使用的地址，如 'chatroom.036b17...98c296'
  store.serverAddr = store.identifiers.main + '.' + store.serverPublicKey;
  // 加载历史登录过的用户
  store.user = getUser();

  // 创建导航组件
  var nav = new Nav();
  // 缓存导航组件，用于切换各个页面
  store.nav = nav;
  // 渲染到浏览器
  nav.render('#app');
  // 创建导航面板
  createNavPanel(nav, store.serverPublicKey, store.serverAddr);

  // // 生成聊天页面
  // const chatPage = new ChatPage({
  //   title: '聊天室',
  //   serverPublicKey: store.serverPublicKey,
  //   serverAddr: store.serverAddr
  // });
  // store.nav.push('chat_page', chatPage);

  // // 生成登录页面
  // const loginPage = new LoginPage({
  //   /**
  //    * 登录表单提交回调函数
  //    * @param {Object} data 表单数据
  //    */
  //   onSubmit: data => {
  //     login(data);
  //   }
  // });
  // // 将“登录页面”添加到导航列表
  // nav.push('login_page', loginPage).navTo('login_page');

  // 连接到 NKN
  connectNKN();
}