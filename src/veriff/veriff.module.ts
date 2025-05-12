import { Module } from '@nestjs/common';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';

@Module({
  controllers: [VeriffController],
  providers: [VeriffService],
})
export class VerffModule {}
