/**
 * app 核心逻辑
 * 主要用于操作数据库、配置文件
 *
 * 用户注册、登录
 * 聊天室（标题、成员数量）
 * 成员管理（添加、移除）
 * 消息管理（接收、分发、缓存）
 */
import { Injectable } from '@angular/core';
import { LoadingController, ToastController, App } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import QRious from 'qrious';
import microtime from 'microtime';

import * as utils from 'common.utils';
import dbUtils from 'common.utils/db';
import pathUtils from 'common.utils/path';
import messageCache from 'common.messages/message-cache';
import { CommunicateModule } from 'common.communicate/communicate';
import { SliceTaskHandler } from 'common.download/slice';

@Injectable()
export class AppService {
  appName = 'chatroom';
  signMode = 'signin';

  // CommunicateModule 实例
  cm = null;
  // 数据库对象
  db = null;
  // 最后一次发送给成员的信息在数据库中的 id
  lastMessageIds = {};
  imGroup = null;
  isLoggedIn = false;
  clients = {};
  user = null;
  // 在线群成员
  // {
  //     publicKey: '...',
  //     underwayMessage: 'bool'
  // }
  //  underwayMessage 表示服务器向一个成员的发送消息任务还没有完成，还没有收到 ACK 或者还没有超时
  onlineMembers = [];
  onlineMemberAddrMap = {};
  // 最大成员数量，默认 1000
  maxMemberNum = 1000;
  identifiers = {
    main: 'chatroom'
  };

  roomUrl = '';
  roomTitle = '聊天室';
  qrCodeRoomUrl = null;

  retryCount = 3;
  retryWaitMS = 3000;

  stats = {
    send: 0,
    error: 0
  };

  needApproval = false;

  constructor(
    public app: App,
    public storage: Storage,
    public toastCtrl: ToastController,
    public loadingCtrl: LoadingController
  ) {
    window['AppService'] = this;
  }

  /**
   * 初始化数据库
   */
  initDatabase() {
    const userDir = pathUtils.getDefaultUserDataPath(
      window['process'].platform,
      this.appName
    );
    pathUtils.createAppFolders(userDir);
    // console.log('initDatabase', userDir);

    this.db = dbUtils.initDatabase(userDir, errorMessage => {
      alert('数据库初始化失败');
      console.log('init database failed.', errorMessage);
    });

    messageCache.initSchema(this.db);
  }

  /**
   * 缓存一条消息
   *
   */
  cacheMessage(payload) {
    // db, publicKey, body, type
    // console.log('cacheMessage', payload);

    messageCache.cacheMessage(this.db, payload);
  }

  /**
   * 更新发给成员最后一条消息的 id
   * @param publicKey
   * @param messageId
   */
  updateLastMessageId(publicKey, messageId) {
    this.lastMessageIds[publicKey] = messageId;

    messageCache.updateLastMessageId(this.db, publicKey, messageId);
  }

  /**
   * 注册
   * @param nickname
   * @param password
   */
  async signUp(nickname, password) {
    const user = {
      nickname: nickname
    };

    this._connectNknServer(user, password);
  }

  /**
   * 登录
   */
  async signIn(nickname, publicKey, password) {
    let user = await this.storage.get('user');
    let privateKey;

    try {
      privateKey = utils.decrypt(user.privateKey, password);
    } catch (error) {
      privateKey = '';
    }

    // 校验密码
    if (privateKey === '') {
      const toast = this.toastCtrl.create({
        message: '密码不正确',
        duration: 3000,
        position: 'top'
      });
      toast.present();
      return;
    }

    user.nickname = nickname;
    user.privateKey = privateKey;

    this._connectNknServer(user, password);
  }

  logout() {
    if (window.confirm('确定退出？')) {
      this.isLoggedIn = false;
      this.storage.set('isLoggedIn', false);
      // this.storage.set('user', null);
      this.signMode = 'signin';
    }
  }

  /**
   * 使用通讯模块连接 NKN 服务器
   * @param user
   * @param password
   */
  _connectNknServer(user, password) {
    // 渲染加载中图标
    const loader = this.loadingCtrl.create({
      spinner: 'crescent',
      content: '连接中...'
    });
    loader.present();

    const cm = new CommunicateModule();
    const opt = {
      identifier: this.identifiers.main,
      retryCount: 10000,
      retryWaitMS: 100,
      onSuccess: () => {
        loader.dismiss();
        const key = cm.getClientKey();

        this.bindNknClientEvents();
        // 记录用户信息
        this.user = {
          nickname: user.nickname,
          publicKey: key.publicKey,
          privateKey: utils.encrypt(key.privateKey, password)
        };
        this.storage.set('user', this.user);

        // 修改登录状态
        this.isLoggedIn = true;
        this.storage.set('isLoggedIn', true);

        this.roomUrl = `http://knowbb.io/?server=${key.publicKey}`;

        this.makeQrCode(this.roomUrl);

        (async () => {
          await this.loadMembers();
          this.dispatchMessageLoop();
        })();
      },
      onError: () => {
        loader.dismiss();
        alert('连接服务器失败');
      },
      privateKey: null,
      seedRpcServerAddr: 'http://35.229.164.111:30003'
    };

    if (user.privateKey) {
      opt.privateKey = user.privateKey;
    }

    cm.createClient(
      opt.identifier,
      opt.retryCount,
      opt.retryWaitMS,
      opt.onSuccess,
      opt.onError,
      opt.privateKey,
      opt.seedRpcServerAddr
    );

    this.cm = cm;
  }

  /**
   * 添加 nkn 客户端实例
   * @param name 实例名称
   * @param client 实例对象
   */
  addClient(name: string, client: any) {
    this.clients[name] = client;
  }

  /**
   * NKN 客户端绑定事件
   * @param client
   */
  bindNknClientEvents() {
    let _this = this;
    // 创建分片任务类型消息拦截器
    let sliceTaskHandler = new SliceTaskHandler(this.cm);

    _this.cm.reviceMessage(function(
      src,
      responseID,
      payload,
      needResponse,
      offset,
      count,
      total
    ) {
      // console.log(
      //   'reviceMessage',
      //   payload,
      //   responseID,
      //   needResponse,
      //   offset,
      //   count,
      //   total
      // );

      const _payload = JSON.parse(payload);
      // console.log(src, _payload);

      switch (_payload.cmd) {
        // 加入聊天室
        case 'ROOM_JOIN': {
          let response = {
            cmd: _payload.cmd,
            msg: {
              needApproval: _this.needApproval,
              room: {
                title: _this.roomTitle
              }
            }
          };

          let recvUserPublicKey = utils.parseAddr(src).publicKey;
          /* 查询用户详情 */
          let userInfo = messageCache.getUserInfo(_this.db, recvUserPublicKey);
          let reason = null;
          // console.log("ROOM_JOIN", userInfo)

          if (_this.needApproval) {
            /* 标志需要批准 */
            response.msg['joinedStatus'] = userInfo.joinedStatus;

            /* 获取申请理由 */
            reason = _payload.msg.reason;

            if (userInfo.joinedStatus == 'joined') {
              /* 已批准用户回复批准时间和用户状态 */
              response.msg['approveDate'] = userInfo.approveDate;
              response.msg['userStatus'] = userInfo.userStatus;
            }
          } else {
            /* 不需要批准则默认已批准该用户 */
            userInfo.joinedStatus = 'joined';
            userInfo.approveDate = response.msg[
              'approveDate'
            ] = new Date().getTime();
            userInfo.userStatus = response.msg['userStatus'] = 'normal';
          }

          const opt = {
            toUser: `${_this.identifiers.main}.${recvUserPublicKey}`,
            data: JSON.stringify(response),
            needACK: true,
            needResponse: false,
            retryCount: _this.retryCount,
            retryWaitMS: 10000,
            onSuccess: () => {},
            onError: err => {
              console.log('ROOM_JOIN onError', err, new Date());
            },
            onResponse: null,
            responseID: responseID
          };

          // console.log('Recv ROOM_JOIN', 'RX: ', _payload, 'TX', response);

          _this.sendMessage(opt);

          // 加入新成员，重新初始化群组分发功能
          _this.addOnlineMember(src, userInfo, reason);

          // console.log(' ... ', _this.onlineMembers);
          break;
        }

        case 'NEW_MESSAGE': {
          let userInfo = messageCache.getUserInfo(
            _this.db,
            utils.parseAddr(src).publicKey
          );
          if (userInfo.inBlackList) {
            /* 黑名单用户不处理消息 */
            break;
          }

          _this.addOnlineMember(src, userInfo);
          _payload.msg.serverTimestamp = microtime.now();
          _this.cacheMessage(_payload);
          break;
        }

        case 'SLICE_DOWNLOAD': {
          // 拦截收到的信息，如果 payload.cmd === sliceTaskHandler.cmd，就进入切片下载任务回调
          sliceTaskHandler.handle(_payload, msg => {
            // 获取分片信息
            const res = messageCache.getMessageSlice(
              _this.db,
              msg.dataInfo.dataID,
              msg.offset,
              msg.limit
            );

            // 如果分片信息不存在就在 Response 中指定错误信息
            if (!res.status) {
              sliceTaskHandler.response(src, responseID, null, res.errMsg);
            } else {
              sliceTaskHandler.response(src, responseID, res.slice, null);
            }
          });
          break;
        }

        /* 获取文件列表 API */
        case 'GET_FILE_LIST': {
          let options = {
            type: _payload.msg.type,
            ext: _payload.msg.ext ? _payload.msg.ext : '',
            sort: _payload.msg.sort ? _payload.msg.sort : 'asc',
            search: _payload.msg.search ? _payload.msg.search : '',
            offset: _payload.msg.offset ? _payload.msg.offset : 0,
            count: _payload.msg.count ? _payload.msg.count : 2
          };
          let type = _payload.type ? _payload.type : 'list';

          // console.log('GET_FILE_LIST', 'CMDType:', type, 'Options:', options);

          let data = messageCache.getSpecFilesList(_this.db, type, options);

          const opt = {
            toUser: src,
            data: JSON.stringify(data),
            needACK: true,
            needResponse: false,
            retryCount: _this.retryCount,
            retryWaitMS: 10000,
            onSuccess: () => {},
            onError: err => {
              console.log('onError GET_FILE_LIST', err, new Date());
            },
            onResponse: null,
            responseID: responseID
          };

          _this.sendMessage(opt);

          break;
        }

        default:
          break;
      }
    });
  }

  /**
   * 在程序空闲的时候分发已经缓存的消息
   */
  dispatchMessageLoop() {
    const _this = this;

    // 每 0.3 秒检索一次成员列表
    // 如果成员未处于 underway 状态
    // 就给成员发送消息
    setInterval(() => {
      __dispatch();
    }, 300);

    function __dispatch() {
      // console.log('__dispatch', _this.onlineMembers);
      for (let member of _this.onlineMembers) {
        // 判断成员是否处于空闲状态

        if (member.underwayMessage) {
          continue;
        }

        if (_this.needApproval) {
          if (!member.approved) {
            /* 用户未批准加入，不转发消息 */
            continue;
          }
        }

        if (member.inBlackList) {
          /* 用户在黑名单，不转发消息 */
          continue;
        }

        // 新加入用户不返回未读消息
        const oldRecvLastMessageId = messageCache.getMemberReceivedLastMessageId(
          _this.db,
          member.publicKey
        );

        // console.log('__dispatch', member, oldRecvLastMessageId)

        if (oldRecvLastMessageId === -1) {
          continue;
        }

        const unreadMessages = messageCache.getUnreadMessages(
          _this.db,
          member.publicKey,
          member.inWhiteList,
          /* 如果需要批准加入，则需要传入批准时间用于获取批准之后的历史消息 */
          _this.needApproval ? member.approvedTime : 0
        );

        // console.log('__dispatch', member, unreadMessages);

        // 无未读消息，跳过此成员
        if (unreadMessages.length === 0) {
          continue;
        }

        // 将成员状态设置为进行中
        member.underwayMessage = true;

        const cleanPayloads = [];

        for (let item of unreadMessages) {
          // 跳过消息作者
          if (item.sender === member.publicKey) {
            continue;
          }

          let data = {
            cmd: 'NEW_MESSAGE',
            msg: {
              user: {
                nickname: item.sender_name,
                publicKey: item.sender
              },
              message: {
                type: item.type,
                info: {}
              },
              timestamp: item.create_time,
              serverTimestamp: item.receive_time
            }
          };

          switch (item.type) {
            case 'text':
              {
                data.msg.message.info['text'] = item.payload;
              }
              break;
            default:
              {
                data.msg.message.info['name'] = item.file_name;
                data.msg.message.info['ext'] = item.ext_name;
                data.msg.message.info['size'] = item.size;
                data.msg.message.info['len'] = item.length;
                data.msg.message.info['dataID'] = item.data_id;
                data.msg.message.info['md5sum'] = item.md5sum;
                data.msg.message.info['isLazyMode'] = true;

                if (item.type == 'image' || item.type == 'article') {
                  data.msg.message.info['dataUrl'] = item.payload;
                } else {
                  data.msg.message.info['dataUrl'] = '';
                }
              }
              break;
          }
          cleanPayloads.push(data);
        }

        // 生成发送消息需要的配置项，设置发送成功、失败回调函数
        const toUserAddr = `${_this.identifiers.main}.${member.publicKey}`;
        const opt = {
          toUser: toUserAddr,
          data: JSON.stringify({
            cmd: 'UNREAD_MESSAGE',
            msg: cleanPayloads
          }),
          needACK: true,
          needResponse: false,
          retryCount: _this.retryCount,
          onSuccess: () => {
            // 发送成功，更新发送给成员的最后一条消息的 ID
            const lastMessageId =
              unreadMessages[unreadMessages.length - 1]['id'];

            messageCache.updateLastMessageId(
              _this.db,
              member.publicKey,
              lastMessageId
            );
            member.underwayMessage = false;
          },
          onError: err => {
            member.underwayMessage = false;
            // console.log("onError UNREAD_MESSAGE", err, new Date());
            _this.removeMember(toUserAddr);
          },
          onResponse: null,
          responseID: 0
        };

        _this.sendMessage(opt);
      }
    }
  }

  /**
   * 发送消息给客户端
   * @param options 通讯模块参数对象
   */
  sendMessage(option) {
    if (!option.retryWaitMS) {
      option.retryWaitMS = utils.calcRetryTime(option.data);
    }

    this.cm.sendMessage(
      option.toUser,
      option.data,
      option.needACK,
      option.needResponse,
      option.retryCount,
      option.retryWaitMS,
      option.onSuccess,
      option.onError,
      option.onResponse,
      option.responseID
    );
  }

  /**
   * 永久记录该用户
   */
  bakOnlineMembers(publicKey, reason) {
    messageCache.recordUser(this.db, publicKey, this.needApproval, reason);
  }

  /**
   * 从本地存储中获取成员列表
   */
  async loadMembers() {
    const membersInfo = messageCache.getAllOnlineUsers(this.db);
    // console.log('loadMembers', membersInfo);
    if (membersInfo.length > 0) {
      const onlineMemberAddrMap = {};
      const onlineMembers = [];

      for (let userInfo of membersInfo) {
        let addr = this.identifiers.main + '.' + userInfo.publicKey;
        onlineMemberAddrMap[addr] = 1;
        onlineMembers.push({
          publicKey: userInfo.publicKey /* 用户公钥 */,
          approved: userInfo.approved /* 是否已批准加入 */,
          approvedTime: userInfo.approvedTime /* 批准时间 */,
          inBlackList: userInfo.inBlackList /* 用户是否在黑名单中 */,
          inWhiteList: userInfo.inWhiteList /* 用户是否在白名单中 */,
          underwayMessage: false
        });
      }

      this.onlineMembers = onlineMembers;
      this.onlineMemberAddrMap = onlineMemberAddrMap;
    }
  }

  /**
   * 备份聊天室信息
   */
  bakRoomInfo() {
    const _this = this;

    _this.storage.set(`${_this.user.publicKey}:room_info`, {
      title: _this.roomTitle,
      maxMemberNum: _this.maxMemberNum
    });
  }

  /**
   * 从本地存储中获取聊天室信息
   */
  async loadRoomInfo() {
    const info = await this.storage.get(`${this.user.publicKey}:room_info`);

    return info;
  }

  /**
   * 添加成员并在数据库中
   * @param addr 用户 NKN 地址
   * @param userInfo 用户详情
   * @param reason 新用户申请理由
   */
  addOnlineMember(addr, userInfo, reason = null) {
    if (!this.onlineMemberAddrMap[addr]) {
      /* 有新成员加入, 或掉线成员加入 */
      this.onlineMemberAddrMap[addr] = 1;

      const publicKey = utils.parseAddr(addr).publicKey;

      if (userInfo.userExists) {
        /* 数据库存在该用户 */
        messageCache.userSetOnline(this.db, publicKey);
      } else {
        /* 不存在该用户 */
        this.bakOnlineMembers(publicKey, reason);
      }

      this.onlineMembers.push({
        publicKey: publicKey /* 公钥 */,
        approved: userInfo.joinedStatus == 'joined' /* 是否批准加入 */,
        underwayMessage: false /* 是否在处理未发送的历史消息 */,
        inBlackList: userInfo.inBlackList ? true : false /* 是否黑名单用户 */,
        inWhiteList: userInfo.inWhiteList ? true : false /* 是否白名单用户 */
      });

      this.addNewMember(publicKey);
    }
  }

  /**
   * 添加新成员
   * @param publicKey
   */
  addNewMember(publicKey) {
    const recvivedLastMessageId = messageCache.getMemberReceivedLastMessageId(
      this.db,
      publicKey
    );
    // console.log('addNewMember', publicKey, recvivedLastMessageId);

    // 如果成员最后一次接收到的 MessageId 为 -1
    // 表示该成员为新成员，更新数据库中该成员最后一次收到的 MessageId
    if (recvivedLastMessageId === -1) {
      const lastMessageId = messageCache.getLastMessageId(this.db);

      messageCache.updateLastMessageId(this.db, publicKey, lastMessageId);
    }
  }

  /**
   * 广播聊天室信息
   */
  broadcastRoomInfo() {
    this.broadcastGroupMessages({
      cmd: 'ROOM_INFO',
      msg: {
        room: {
          title: this.roomTitle
        }
      }
    });
  }

  /**
   * 广播群信息
   * @param {*} groupKey
   */
  broadcastGroupMessages(payload, messageId = null) {
    let _payload;

    if (typeof payload !== 'string') {
      _payload = JSON.stringify(payload);
    } else {
      _payload = payload;
    }

    const _this = this;
    const members = _this.onlineMembers;

    for (let _m of members) {
      const publicKey = _m.publicKey;
      const opt = {
        toUser: `${_this.identifiers.main}.${publicKey}`,
        data: _payload,
        needACK: true,
        needResponse: false,
        retryCount: _this.retryCount,
        onSuccess: () => {
          if (messageId) {
            _this.updateLastMessageId(publicKey, messageId);
          }
        },
        onError: err => {
          // 发送请求失败
          console.log('broadcastGroupMessages onError', err, new Date());
        },
        onResponse: null,
        responseID: 0
      };

      _this.sendMessage(opt);
    }
  }

  /**
   * 将离线成员移除在线成员数组
   * @param publicKey
   */
  removeMember(addr) {
    // console.log('removeMember', addr);
    const publicKey = utils.parseAddr(addr).publicKey;

    if (this.onlineMemberAddrMap[addr]) {
      delete this.onlineMemberAddrMap[addr];

      for (let index in this.onlineMembers) {
        const member = this.onlineMembers[index];

        if (member.publicKey === publicKey) {
          this.onlineMembers.splice(Number(index), 1);
        }
      }

      messageCache.userSetOffline(this.db, publicKey);
    }
  }

  /**
   * 获取用户对象
   */
  async getAccountUser() {
    let user = await this.storage.get('user');
    /* 初始化是否需要批准状态 */
    let _this = this;
    this.storage.get('serverNeedApproval').then(function(data) {
      if (data) {
        _this.needApproval = data;
      } else {
        _this.needApproval = false;
        _this.storage.set('serverNeedApproval', _this.needApproval);
      }
    });
    return user;
  }

  /**
   * 生成二维码
   */
  makeQrCode(value) {
    var qr = new QRious({
      element: document.querySelector('qrcode--client-url'),
      value: value,
      size: 180
    });

    this.qrCodeRoomUrl = qr.toDataURL();
  }

  /**
   * 时间戳转日期字符串
   * @param timestamp 时间戳
   */
  timestamp2DateString(timestamp) {
    let date = new Date(timestamp);
    let dateString = date.getFullYear().toString() + '-';
    dateString +=
      (date.getMonth() + 1 < 10
        ? '0' + (date.getMonth() + 1)
        : date.getMonth() + 1
      ).toString() + '-';
    dateString += (date.getDate() < 10
      ? '0' + date.getDate()
      : date.getDate()
    ).toString();
    dateString += ' ';
    dateString +=
      (date.getHours() < 10
        ? '0' + date.getHours()
        : date.getHours()
      ).toString() + ':';
    dateString += (date.getMinutes() < 10
      ? '0' + date.getMinutes()
      : date.getMinutes()
    ).toString();
    return dateString;
  }

  /**
   * 获取指定类型的成员列表
   * @param type 成员列表类型
   */
  getAllMembersList(type = 'all') {
    let memberList = [];
    let membersData = messageCache.getAllUsersOfSpecType(this.db, type);

    for (let user of membersData) {
      /* 转换时间戳为日期字符串 */
      let applicationDateString = this.timestamp2DateString(
        user.application_time
      );
      let approveDateString = this.timestamp2DateString(user.approve_time);

      memberList.push({
        public_key: user.public_key,
        application_time: applicationDateString,
        application_reason: user.application_reason,
        approve_time: approveDateString,
        is_blackList: user.is_blackList,
        is_whiteList: user.is_whiteList
      });
    }
    return memberList;
  }

  /**
   * 批准用户加入
   * @param publicKey
   */
  approvedMemberJoin(publicKey) {
    for (let member of this.onlineMembers) {
      if (member.publicKey == publicKey) {
        member.approved = true;
      }
    }
    messageCache.approveUser(this.db, publicKey);
  }

  /**
   * 用户到黑名单操作
   * @param publicKey
   */
  blackListHandle(publicKey, type) {
    for (let member of this.onlineMembers) {
      if (member.publicKey == publicKey) {
        member.inBlackList = type == 'add' ? true : false;
      }
    }
    if (type == 'add') {
      messageCache.pushUserToBlackList(this.db, publicKey);
    } else {
      messageCache.removeUserFromBlackList(this.db, publicKey);
    }
  }

  /**
   * 用户到白名单操作
   * @param publicKey
   */
  whiteListHandle(publicKey, type) {
    for (let member of this.onlineMembers) {
      if (member.publicKey == publicKey) {
        member.inWhiteList = type == 'add' ? true : false;
      }
    }
    if (type == 'add') {
      messageCache.pushUserToWhiteList(this.db, publicKey);
    } else {
      messageCache.removeUserFromWhiteList(this.db, publicKey);
    }
  }

  async modifyNeedApproval(needApproval) {
    this.storage.set('serverNeedApproval', needApproval);
    this.needApproval = needApproval;
  }
}
