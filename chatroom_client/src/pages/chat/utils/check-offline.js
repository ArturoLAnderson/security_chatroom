/**
 * 定时向服务端发送 ROOM_JOIN 请求，检测客户端的在线状态
 */
const { sendJoinRoomRequest, updateRoomTitile } = require('src/utils');

/**
 * 为指定编辑器添加离线检测面板
 * @param {*} editor
 */
function addOfflinePanel(editor) {
  const $editor = editor.$elem;
  const $offlinePanel = $(`
    <div class="offline-panel uic-hide">
      <span class="offline-panel__item offline-panel--control">
        Offline, <a href="javascript:;" class="btn--reconnect">Reconnect</a>
      </span>
      <span class="offline-panel__item offline-panel--loading uic-hide">
        Reconnecting...
        <span class="uic-rotation" style="display: inline-block;">
            <i class="iconfont icon-uic-load" style=""></i>
        </span>
      </span>
    </div>
  `);

  // 绑定“重新连接按钮”点击事件
  $offlinePanel.find('.btn--reconnect').on('click', function() {
    _sendCheckOfflineRequest(editor.chatPanel);
  });

  // 将元素添加到页面
  $editor.append($offlinePanel);
  editor.nodes.$offlinePanel = $offlinePanel;
}

exports.addOfflinePanel = addOfflinePanel;

/**
 * 重置保活心跳定时器
 */
function resetOfflineChecker(chatPanel) {
  clearTimeout(chatPanel._offlineCheckerHandler);

  chatPanel._offlineCheckerHandler = null;

  // 十分钟检测一次用户是否在线 60 * 10 * 1000
  chatPanel._offlineCheckerHandler = setTimeout(() => {
    _sendCheckOfflineRequest(chatPanel);
  }, 60 * 10 * 1000);
}

exports.resetOfflineChecker = resetOfflineChecker;

/**
 * 发送 ROOM_JOIN 请求
 */
function _sendCheckOfflineRequest(chatPanel) {
  const editor = chatPanel.editor;

  sendJoinRoomRequest(
    (src, payload) => {
      updateRoomTitile(payload.msg.room.title);
      _hideOfflinePanel(editor);
      __onRecv();
    },
    () => {
      _showOfflinePanel(editor);
      __onRecv();
    }
  );

  /**
   * 初始化离线面板，重置离线检查器
   * sendJoinRoomRequest 被调用 onResponse 和 onError 时会触发此函数
   */
  function __onRecv() {
    _switchOfflinePanelLoading(editor, 'control');
    resetOfflineChecker(chatPanel);
  }
}

/**
 * 展示编辑器内的离线面板
 * @param {*} editor
 */
function _showOfflinePanel(editor) {
  editor.nodes.$offlinePanel.removeClass('uic-hide');
}

/**
 * 隐藏编辑器内的离线面板
 * @param {*} editor
 */
function _hideOfflinePanel(editor) {
  editor.nodes.$offlinePanel.addClass('uic-hide');
}

/**
 * 切换离线状态面板显示状态
 * @param {*} $panel
 * @param {*} status
 */
function _switchOfflinePanelLoading(editor, status = 'loading') {
  const $offlinePanel = editor.nodes.$offlinePanel;

  $offlinePanel.find('.offline-panel__item').addClass('uic-hide');
  $offlinePanel.find(`.offline-panel--${status}`).removeClass('uic-hide');
}
