import { Component } from '@angular/core';
import {
  NavController,
  NavParams,
  ViewController,
  ToastController,
  AlertController,
  LoadingController
} from 'ionic-angular';

import { AppService } from '../../app/app.service';
/**
 * Generated class for the MembersMangerPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-members-manger',
  templateUrl: 'members-manger.html'
})
export class MembersMangerPage {
  loadingView = null;
  needApproval = null;

  membersType = 'joined';
  joinedUsersList = [];
  waitingUserList = [];

  constructor(
    public viewCtrl: ViewController,
    public navCtrl: NavController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public loadingCtrl: LoadingController,
    public appService: AppService
  ) {
    /* 获取是否需要批准加入 */
    this.needApproval = navParams.get('needApproval');
  }

  showLoading() {
    this.loadingView = this.loadingCtrl.create({
      content: '加载中, 请稍后 ...'
    });
    this.loadingView.present();
  }

  dismissLoading() {
    if (this.loadingView) {
      this.loadingView.dismiss();
    }
  }

  ionViewDidLoad() {
    this.showLoading();
  }

  ionViewDidEnter() {
    /* 加载用户列表 */
    this.joinedUsersList = this.appService.getAllMembersList('joined');
    this.waitingUserList = this.appService.getAllMembersList('waiting');
    this.dismissLoading();
  }

  showToast(message) {
    const toast = this.toastCtrl.create({
      message: message,
      duration: 1500,
      position: 'top'
    });
    toast.present();
  }

  showAlert(message) {
    const alert = this.alertCtrl.create({
      subTitle: message,
      buttons: ['好的']
    });
    alert.present();
  }

  approvedJoin(item) {
    /* 批准用户加入 */
    let index = this.waitingUserList.indexOf(item);
    item.approve_time = this.appService.timestamp2DateString(
      new Date().getTime()
    );
    this.joinedUsersList.push(item);
    this.waitingUserList.splice(index, 1);
    this.appService.approvedMemberJoin(item.public_key);
    this.showToast('添加成功');
  }

  blackListHandle(item) {
    /* 将用户加入黑名单 */
    if (item.is_whiteList) {
      this.showAlert('用户已经在白名单中');
    } else {
      if (item.is_blackList) {
        this.appService.blackListHandle(item.public_key, 'rem');
        this.showToast('已将用户移除黑名单');
        item.is_blackList = 0;
      } else {
        this.appService.blackListHandle(item.public_key, 'add');
        this.showToast('已将用户加入黑名单');
        item.is_blackList = 1;
      }
    }
  }

  whiteListHandle(item) {
    /* 将用户加入白名单 */
    if (item.is_blackList) {
      this.showAlert('用户已经在黑名单中');
    } else {
      if (item.is_whiteList) {
        this.appService.whiteListHandle(item.public_key, 'rem');
        this.showToast('已将用户移除白名单');
        item.is_whiteList = 0;
      } else {
        this.appService.whiteListHandle(item.public_key, 'add');
        this.showToast('已将用户加入白名单');
        item.is_whiteList = 1;
      }
    }
  }

  close() {
    this.viewCtrl.dismiss();
  }
}
