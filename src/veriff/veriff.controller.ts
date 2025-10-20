import {
  Controller,
  Post,
  Headers,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
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
    @Res() response: Response,
  ) {
    try {
      await this.veriffService.validateWebhookRequest(signature, body);

      this.logger.debug('Handled webhook payload from Veriff');
      response.status(HttpStatus.OK).send();
    } catch (e) {
      if (e instanceof HttpException) throw e;
      console.error(e);
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
