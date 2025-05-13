import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { getAccountNameFromDid, util } from '@tonomy/tonomy-id-sdk';
import * as crypto from 'crypto';

export type VeriffPayload = {
  appName: string;
};

@Injectable()
export class VeriffService {
  private readonly logger = new Logger(VeriffService.name);
  private readonly VERIFF_SECRET =
    process.env.VERIFF_SECRET || 'default_secret'; // .env usage

  validateSignature(signature: string, payload: any): boolean {
    const computedSignature = crypto
      .createHmac('sha256', this.VERIFF_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  async validateWebhookRequest(
    signature: string,
    payload: any,
  ): Promise<{
    accountName: string;
    appName: string;
  }> {
    this.logger.debug('Handling webhook payload from Veriff:', payload);
    const { vendorData: jwt } = payload;
    if (!jwt) {
      throw new HttpException(
        'vendorData (VC JWT) is missing',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verify signature
    if (!this.validateSignature(signature, payload)) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    try {
      // Decode and verify VC
      const vc = await new util.VerifiableCredential<VeriffPayload>(jwt);
      console.log('####vc', vc);
      await vc.verify();

      const { appName } = await vc.getCredentialSubject();

      const did = vc.getId();
      if (did) {
        const accountName = getAccountNameFromDid(did);
        return { accountName: accountName.toString(), appName };
      } else {
        throw new HttpException('Invalid did', HttpStatus.BAD_REQUEST);
      }
    } catch (e) {
      throw new HttpException(
        `VC verification failed: ${e.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
