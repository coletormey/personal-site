import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { WelcomeCardComponent } from './welcome/welcome-card/welcome-card.component';
import { InterestsCardComponent } from './welcome/interests-card/interests-card.component';

@NgModule({
  declarations: [
    AppComponent,
    WelcomeCardComponent,
    InterestsCardComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
