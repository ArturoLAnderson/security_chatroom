import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { IonicStorageModule } from '@ionic/storage';

import { MyApp } from './app.component';
import { AppService } from './app.service';
import { HomePage } from '../pages/home/home';
import { SignPage } from '../pages/sign/sign';
import { ModifyInputPage } from '../pages/modify-input/modify-input';
import { MembersMangerPage } from '../pages/members-manger/members-manger';

@NgModule({
  declarations: [MyApp, HomePage, SignPage, ModifyInputPage, MembersMangerPage],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot()
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    SignPage,
    ModifyInputPage,
    MembersMangerPage
  ],
  providers: [
    AppService,
    { provide: ErrorHandler, useClass: IonicErrorHandler }
  ]
})
export class AppModule {}
