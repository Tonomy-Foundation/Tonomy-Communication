import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommunicationModule } from './communication/communication.module';
import { AccountsModule } from './accounts/accounts.module';
import { VerffModule } from './veriff/veriff.module';
import { InfoModule } from './info/info.module';

@Module({
  imports: [CommunicationModule, AccountsModule, VerffModule, InfoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
