import { Logger, Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationGateway } from './communication.gateway';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';

@Module({
  providers: [
    CommunicationGateway,
    CommunicationService,
    Logger,
    TransformVcPipe,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
