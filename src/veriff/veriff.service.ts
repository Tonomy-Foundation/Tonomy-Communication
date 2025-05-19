import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

import * as crypto from 'crypto';
import {
  VerifiableCredentialFactory,
  AccountNameHelper,
  VeriffWatchlistService,
} from './veriff.helpers';
import { VeriffWebhookPayload, WatchlistScreeningResult } from './veriff.types';

export type VeriffPayload = {
  appName: string;
};

@Injectable()
export class VeriffService {
  constructor(
    private readonly credentialFactory: VerifiableCredentialFactory,
    private readonly accountNameHelper: AccountNameHelper,
    private readonly veriffWatchlistService: VeriffWatchlistService,
    private readonly logger: Logger,
  ) {}
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
    payload: VeriffWebhookPayload,
  ): Promise<{
    accountName: string;
    appName: string;
  }> {
    this.logger.debug('Handling webhook payload from Veriff:', payload);
    const { vendorData: jwt, data, status } = payload;
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
      const vc = this.credentialFactory.create<VeriffPayload>(jwt);
      await vc.verify();
      const { appName } = await vc.getCredentialSubject();
      const did = vc.getId();

      if (!did) {
        throw new HttpException('Invalid did', HttpStatus.BAD_REQUEST);
      }

      const rawAccountName = this.accountNameHelper.getAccountNameFromDid(did);
      const accountName =
        rawAccountName !== null && rawAccountName !== undefined
          ? rawAccountName.toString()
          : 'null';

      // Check pepSanctionMatches
      let pepSanctionMatches: WatchlistScreeningResult | null = null;
      if (data.verification.decision === 'approved') {
        try {
          pepSanctionMatches =
            await this.veriffWatchlistService.getWatchlistScreening(
              payload.sessionId,
            );
          this.logger.debug('Watchlist result:', pepSanctionMatches);
        } catch (e) {
          this.logger.warn('Failed to fetch watchlist screening:', e.message);
        }
      }

      return { accountName, appName };
    } catch (e) {
      throw new HttpException(
        `VC verification failed: ${e.message}`,
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
