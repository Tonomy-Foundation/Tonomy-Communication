import { Module } from '@nestjs/common';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [VeriffController],
  providers: [VeriffService],
})
export class VerffModule {}
