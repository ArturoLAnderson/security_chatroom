require('./login.css');

const { BaseComponent } = require('common.ui-components/base');
const { store } = require('src/store');

/**
 * @class
 * 登录页面组件
 */
class LoginPage extends BaseComponent {
  constructor(config) {
    super(config);
  }

  create() {
    this.createRootElem(`
      <div data-uic-page="login" class="uic-page login-page">
        <div class="uic-header">
          <div class="uic-toolbar">
            <div class="toolbar-container">
            </div>
            <div class="uic-title">
              <div class="toolbar-title">
                chatroom
              </div>
            </div>
          </div>
        </div>
        <div class="uic-content" style="padding: 20px; padding-top: 60px;">
          <div class="uic-form">
            <div class="form-group">
              <label class="form-label" for="input--nickname">nickname</label>
              <input class="form-input nickname" id="input--nickname" type="text" maxlength="20" placeholder="nickname,1~16 characters">
              <br class="form-item__msg" />
              <label class="form-label form-item__msg" for="input--msg">description</label>
              <input class="form-input nickname form-item__msg" id="input--msg" type="text" maxlength="20" placeholder="optional, describe yourself.">
              <br />
              <div class="login-button" style="padding-top: 10px;">
                <button type="button" class="uic-button uic-button-md uic-block" id="btn--login">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  onCreated() {
    const onSubmit = this.config.onSubmit;
    const $elem = this.$elem;

    // 如果曾经登录过此聊天室，就将上次记录的昵称添加到输入框中
    if (store.user && store.user.nickname) {
      $elem.find('#input--nickname').val(store.user.nickname);
    }

    if (__isJoined()) {
      // 如果已经加入过该聊天室就隐藏申请加入时的描述信息
      $elem.find('.form-item__msg').hide();
    }

    // 登录按钮点击事件
    $elem.find('#btn--login').on('click', function() {
      const nickname = $.trim($elem.find('#input--nickname').val());
      const joinReason = $.trim($elem.find('#input--msg').val());

      if (nickname.length === 0 || nickname.length > 16) {
        alert('Invalid nickname, 1~16 characters allowed.');
        return false;
      }

      // 触发表单提交回调函数
      onSubmit && onSubmit({ nickname: nickname, joinReason: joinReason });
    });

    /**
     * 判断是否已经加入过该聊天室
     */
    function __isJoined() {
      return store.localStore.get(`${store.serverPublicKey}:joined`);
    }
  }
}

exports.LoginPage = LoginPage;
