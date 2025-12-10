import { Module } from '@nestjs/common';
import { BaseTokenTransferMonitorService } from './baseTransferMonitor.service';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [CommunicationModule],
  providers: [BaseTokenTransferMonitorService],
})
export class BaseTransferMonitorModule {}
