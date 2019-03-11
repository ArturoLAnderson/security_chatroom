import { Component } from '@angular/core';
import { NavController, ModalController, ToastController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { AppService } from '../../app/app.service';
import { ModifyInputPage } from '../modify-input/modify-input';
import { MembersMangerPage } from '../members-manger/members-manger';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  needApproval = false;
  constructor(
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public appService: AppService,
    public navCtrl: NavController,
    public storage: Storage
  ) {
    /* 获取是否需要批准加入配置 */
    let _this = this;
    this.storage.get('serverNeedApproval').then(function(data) {
      if (data) {
        _this.needApproval = data;
      } else {
        _this.needApproval = false;
        _this.storage.set('serverNeedApproval', _this.needApproval);
      }
    });
  }

  /**
   * 展示修改昵称模态窗口
   */
  showModifyTitleModal() {
    const modal = this.modalCtrl.create(ModifyInputPage, {
      title: '修改聊天室标题',
      value: this.appService.roomTitle
    });

    modal.onDidDismiss(data => {
      if (data) {
        this.appService.roomTitle = data.value;
        this.appService.broadcastRoomInfo();
        this.appService.bakRoomInfo();
      }
    });
    modal.present();
  }

  /* 显示成员管理 View */
  showMembersManager() {
    // console.log('showMembersManager');
    const modal = this.modalCtrl.create(MembersMangerPage, {
      /* 传入是否需要批准配置用于判断是否显示待批准列表 */
      needApproval: this.needApproval
    });
    modal.present();
  }

  /* 修改是否需要批准加入配置 */
  modifyNeedApproval() {
    // console.log('modifyNeedApproval', this.needApproval);
    this.appService.modifyNeedApproval(this.needApproval);
  }
}
