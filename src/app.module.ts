import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommunicationModule } from './communication/communication.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  imports: [CommunicationModule, AccountsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
