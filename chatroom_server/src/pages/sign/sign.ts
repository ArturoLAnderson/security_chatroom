/**
 * 注册、登录 UI 逻辑
 */

import { Component } from "@angular/core";
import { ToastController } from "ionic-angular";
import { AppService } from "../../app/app.service";

@Component({
  selector: "sign-page",
  templateUrl: "sign.html"
})
export class SignPage {
  // 登录表单初始值
  signInForm = {
    nickname: "server",
    publicKey: "",
    password: ""
  };

  // 注册表单初始值
  signUpForm = {
    nickname: "server",
    password: "",
    password2: ""
  };

  /**
   * 注册、登录页面构造函数
   * 打开页面后自动执行初始化数据库、初始化历史登录用户
   * @param appService
   * @param toastCtrl
   */
  constructor(
    private appService: AppService,
    public toastCtrl: ToastController
  ) {
    (async () => {
      appService.initDatabase();

      let user = await appService.getAccountUser();
      console.log("SignPage", user);

      if (user) {
        appService.signMode = "signin";
        this.signInForm.nickname = user.nickname;
        this.signInForm.publicKey = user.publicKey;
      } else {
        appService.signMode = "signup";
      }
    })();
  }

  ngOnInit() {}

  /**
   * 切换登录、注册面板
   * @param signMode 被切换的模式
   */
  switchSignMode(signMode: string) {
    this.appService.signMode = signMode;
  }

  /**
   * 执行注册
   */
  signUp() {
    const nickname = this.signUpForm.nickname;

    // 昵称输入检测
    if (nickname.length == 0 || nickname.length > 20) {
      const toast = this.toastCtrl.create({
        message: "昵称只允许1~20个字符",
        duration: 3000,
        position: "top"
      });
      toast.present();
      return;
    }

    const password = this.signUpForm.password;
    const password2 = this.signUpForm.password2;

    // 检测密码长度
    if (password.length < 6 || password2.length < 6) {
      const toast = this.toastCtrl.create({
        message: "密码最少6位",
        duration: 3000,
        position: "top"
      });
      toast.present();
      return;
    }

    // 检测两次输入的密码是否匹配
    if (password !== password2) {
      const toast = this.toastCtrl.create({
        message: "两次输入密码不匹配",
        duration: 3000,
        position: "top"
      });
      toast.present();
      return;
    }

    try {
      (async () => {
        this.appService.signUp(nickname, password);
        this.signUpForm.password = "";
        this.signUpForm.password2 = "";
      })();
    } catch (error) {
      console.log("catch error", error);
    }
  }

  /**
   * 执行登录
   */
  signIn() {
    const nickname = this.signInForm.nickname;

    // 昵称输入检测
    if (nickname.length == 0 || nickname.length > 20) {
      const toast = this.toastCtrl.create({
        message: "请先注册",
        duration: 3000,
        position: "top"
      });
      toast.present();
      return;
    }

    const password = this.signInForm.password;

    // 检测密码长度
    if (password.length < 6) {
      const toast = this.toastCtrl.create({
        message: "密码至少 6 位",
        duration: 3000,
        position: "top"
      });
      toast.present();
      return;
    }

    this.appService.signIn(nickname, this.signInForm.publicKey, password);
    this.signInForm.password = "";
  }
}
