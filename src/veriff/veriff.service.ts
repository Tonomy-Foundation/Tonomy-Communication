import { Injectable, Logger } from '@nestjs/common';

import * as crypto from 'crypto';
import {
  VerifiableCredentialFactory,
  VeriffWatchlistService,
  getDid,
  getTonomyOpsIssuer,
} from './veriff.helpers';
import { VeriffWebhookPayload, WatchlistScreeningResult } from './veriff.types';
import { CommunicationService } from '../communication/communication.service';

import { util } from '@tonomy/tonomy-id-sdk';

import { CommunicationGateway } from '../communication/communication.gateway';
export type VeriffPayload = {
  appName: string;
};

const ENABLE_PEP_CHECK = false;

@Injectable()
export class VeriffService {
  constructor(
    private readonly credentialFactory: VerifiableCredentialFactory,
    private readonly veriffWatchlistService: VeriffWatchlistService,
    private readonly logger: Logger,
    private readonly communicationGateway: CommunicationGateway,
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
  ): Promise<{ accountName: string; appName: string } | null> {
    this.logger.debug('Handling webhook payload from Veriff:', payload);
    const { vendorData: jwt, data, status } = payload;
    if (!jwt) {
      this.logger.warn('vendorData (VC JWT) is missing, cannot proceed.');
      return null;
    }

    // Verify signature
    if (!this.validateSignature(signature, payload)) {
      this.logger.warn('Invalid signature, cannot proceed.');
      return null;
    }

    try {
      const vc = await this.credentialFactory.create<VeriffPayload>(jwt);
      const { appName } = await vc.getCredentialSubject();
      const accountName = vc.getAccount() ?? 'null'; // Convert null to 'null'
      const did = vc.getId();

      if (!did) {
        this.logger.warn('VC is missing DID, cannot proceed.');
        return null;
      }

      // Check pepSanctionMatches
      if (data.verification.decision === 'approved') {
        try {
          let pepSanctionMatches: WatchlistScreeningResult | null = null;
          if (ENABLE_PEP_CHECK) {
            pepSanctionMatches =
              await this.veriffWatchlistService.getWatchlistScreening(
                payload.sessionId,
              );
            this.logger.debug('Watchlist result:', pepSanctionMatches);
          }
        } catch (e) {
          this.logger.warn('Failed to fetch watchlist screening:', e.message);
        }

        const issuer = await getTonomyOpsIssuer();

        const signedVc = await util.VerifiableCredential.sign(
          '',
          'VeriffCredential',
          {
            verification: payload,
          },
          issuer,
          {
            subject: '',
          },
        );

        const mewPayload = JSON.stringify({
          kyc: signedVc,
        });

        const recipientDid = await getDid(accountName);

        this.communicationGateway.sendVeriffVerificationToDid(
          recipientDid,
          mewPayload,
        );

        return { accountName, appName };
      }
      this.logger.debug(
        'Verification decision is not approved, skipping response data.',
      );
      return null;
    } catch (e) {
      this.logger.error(
        'Failed to process Veriff webhook:',
        e.message,
        e.stack,
      );
      return null;
    }
  }
}
