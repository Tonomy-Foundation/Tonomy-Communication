import { Logger, Module } from '@nestjs/common';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import { HttpModule } from '@nestjs/axios';
import {
  VeriffWatchlistService,
  VerifiableCredentialFactory,
} from './veriff.helpers';
import { CommunicationService } from '../communication/communication.service';
import { CommunicationGateway } from '../communication/communication.gateway';

@Module({
  imports: [HttpModule],
  controllers: [VeriffController],
  providers: [
    VeriffService,
    VeriffWatchlistService,
    {
      provide: VerifiableCredentialFactory,
      useValue: new VerifiableCredentialFactory(),
    },
    Logger,
    CommunicationService,
    CommunicationGateway,
  ],
})
export class VerffModule {}
