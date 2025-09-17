import { Logger, Module } from '@nestjs/common';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import { HttpModule } from '@nestjs/axios';
import {
  VeriffWatchlistService,
  VerifiableCredentialFactory,
} from './veriff.helpers';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [HttpModule, CommunicationModule],
  controllers: [VeriffController],
  providers: [
    VeriffService,
    VeriffWatchlistService,
    {
      provide: VerifiableCredentialFactory,
      useValue: new VerifiableCredentialFactory(),
    },
    Logger,
  ],
})
export class VerffModule {}
