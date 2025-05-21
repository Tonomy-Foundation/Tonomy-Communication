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

@Controller('veriff')
export class VeriffController {
  constructor(
    private readonly veriffService: VeriffService,
    private readonly logger: Logger,
  ) {}
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-hmac-signature') signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const result = await this.veriffService.validateWebhookRequest(
      signature,
      body,
    );

    this.logger.debug('Handling webhook payload from Veriff:', result);
    return res.status(200);
  }
}
