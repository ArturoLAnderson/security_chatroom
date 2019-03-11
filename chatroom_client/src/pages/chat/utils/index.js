/**
 * 通过 MessageItem 向上查找到所属 ChatPage 配置中存储的灯塔地址
 * @param {MessageItem} messageItem
 */
function getChatPageServerAddr(messageItem) {
  const serverAddr = messageItem.chatPanel.config.chatPage.config.serverAddr;

  return serverAddr;
}

exports.getChatPageServerAddr = getChatPageServerAddr;
