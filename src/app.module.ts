import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommunicationModule } from './communication/communication.module';
import { AccountsModule } from './accounts/accounts.module';
import { VerffModule } from './veriff/veriff.module';
import { InfoModule } from './info/info.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommunicationModule,
    AccountsModule,
    VerffModule,
    InfoModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
