import { Module } from '@nestjs/common';
import { BaseTokenTransferMonitorService } from './baseTransferMonitor.service';

@Module({
    providers: [BaseTokenTransferMonitorService],
})
export class BaseTransferMonitorModule { }
