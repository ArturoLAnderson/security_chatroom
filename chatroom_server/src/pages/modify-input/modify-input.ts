import { Component, ViewChild, ElementRef } from '@angular/core';
import {
  NavController,
  NavParams,
  ViewController,
  ToastController
} from 'ionic-angular';

@Component({
  selector: 'page-modify-input',
  templateUrl: 'modify-input.html'
})
export class ModifyInputPage {
  title = null;
  value = null;

  @ViewChild('value_input')
  valueInput: ElementRef;

  constructor(
    public viewCtrl: ViewController,
    public toastCtrl: ToastController,
    public navCtrl: NavController,
    public navParams: NavParams
  ) {
    this.title = navParams.get('title');
    this.value = navParams.get('value');
  }

  ionViewDidLoad() {
    if (this.valueInput && this.valueInput.nativeElement) {
      this.valueInput.nativeElement.focus();
    }
  }

  cancel() {
    this.viewCtrl.dismiss();
  }

  done() {
    if (!this.value || this.value.length === 0) {
      const toast = this.toastCtrl.create({
        message: '输入不能为空',
        duration: 2000,
        position: 'top'
      });
      toast.present();
      return;
    }

    if (this.value.length > 20) {
      const toast = this.toastCtrl.create({
        message: '只允许1~20个字符',
        duration: 2000,
        position: 'top'
      });
      toast.present();
      return;
    }

    this.viewCtrl.dismiss({
      value: this.value
    });
  }
}
