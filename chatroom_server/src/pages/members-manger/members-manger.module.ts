import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { MembersMangerPage } from './members-manger';

@NgModule({
  declarations: [
    MembersMangerPage,
  ],
  imports: [
    IonicPageModule.forChild(MembersMangerPage),
  ],
})
export class MembersMangerPageModule {}
