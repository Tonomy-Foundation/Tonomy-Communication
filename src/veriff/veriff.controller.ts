import {
  Controller,
  Post,
  Headers,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { VeriffService } from './veriff.service';
import { VeriffWebhookPayload } from '@tonomy/tonomy-id-sdk';

@Controller('v1/verification/veriff/webhook')
export class VeriffController {
  constructor(
    private readonly veriffService: VeriffService,
    private readonly logger: Logger,
  ) {}
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-hmac-signature') signature: string,
    @Body() body: VeriffWebhookPayload,
    @Res() res: Response,
  ) {
    await this.veriffService.validateWebhookRequest(signature, body);

    this.logger.debug('Handling webhook payload from Veriff');
    return res.status(200);
  }
}
