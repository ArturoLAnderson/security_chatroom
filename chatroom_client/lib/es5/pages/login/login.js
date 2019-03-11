'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('./login.css');

var _require = require('common.ui-components/base'),
    BaseComponent = _require.BaseComponent;

var _require2 = require('../../store'),
    store = _require2.store;

/**
 * @class
 * 登录页面组件
 */


var LoginPage = function (_BaseComponent) {
  _inherits(LoginPage, _BaseComponent);

  function LoginPage(config) {
    _classCallCheck(this, LoginPage);

    return _possibleConstructorReturn(this, (LoginPage.__proto__ || Object.getPrototypeOf(LoginPage)).call(this, config));
  }

  _createClass(LoginPage, [{
    key: 'create',
    value: function create() {
      this.createRootElem('\n      <div data-uic-page="login" class="uic-page login-page">\n        <div class="uic-header">\n          <div class="uic-toolbar">\n            <div class="toolbar-container">\n            </div>\n            <div class="uic-title">\n              <div class="toolbar-title">\n                chatroom\n              </div>\n            </div>\n          </div>\n        </div>\n        <div class="uic-content" style="padding: 20px; padding-top: 60px;">\n          <div class="uic-form">\n            <div class="form-group">\n              <label class="form-label" for="input--nickname">nickname</label>\n              <input class="form-input nickname" id="input--nickname" type="text" maxlength="20" placeholder="nickname,1~16 characters">\n              <br class="form-item__msg" />\n              <label class="form-label form-item__msg" for="input--msg">description</label>\n              <input class="form-input nickname form-item__msg" id="input--msg" type="text" maxlength="20" placeholder="optional, describe yourself.">\n              <br />\n              <div class="login-button" style="padding-top: 10px;">\n                <button type="button" class="uic-button uic-button-md uic-block" id="btn--login">Join</button>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ');
    }
  }, {
    key: 'onCreated',
    value: function onCreated() {
      var onSubmit = this.config.onSubmit;
      var $elem = this.$elem;

      // 如果曾经登录过此聊天室，就将上次记录的昵称添加到输入框中
      if (store.user && store.user.nickname) {
        $elem.find('#input--nickname').val(store.user.nickname);
      }

      if (__isJoined()) {
        // 如果已经加入过该聊天室就隐藏申请加入时的描述信息
        $elem.find('.form-item__msg').hide();
      }

      // 登录按钮点击事件
      $elem.find('#btn--login').on('click', function () {
        var nickname = $.trim($elem.find('#input--nickname').val());
        var joinReason = $.trim($elem.find('#input--msg').val());

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
        return store.localStore.get(store.serverPublicKey + ':joined');
      }
    }
  }]);

  return LoginPage;
}(BaseComponent);

exports.LoginPage = LoginPage;