import {
  Controller,
  Post,
  Headers,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { VeriffService } from './veriff.service';

@Controller('veriff')
export class VeriffController {
  constructor(private readonly veriffService: VeriffService) {}
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-hmac-signature') signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const { accountName, appName } =
      await this.veriffService.validateWebhookRequest(signature, body);

    // Now you can use accountName and appName to update user status, etc.
    console.log('Webhook received for', accountName, 'from app', appName);
    return res.status(200).send('OK');
  }
}
