import { Injectable, Logger } from '@nestjs/common';

import * as crypto from 'crypto';
import {
  VerifiableCredentialFactory,
  AccountNameHelper,
  VeriffWatchlistService,
} from './veriff.helpers';
import { VeriffWebhookPayload, WatchlistScreeningResult } from './veriff.types';
import { CommunicationService } from '../communication/communication.service';
import { createSigner } from '@tonomy/tonomy-id-sdk';
import { util } from '@tonomy/tonomy-id-sdk';
import settings from '../settings';
import { PrivateKey } from '@wharfkit/antelope';
import { getChainInfo } from '../../node_modules/@tonomy/tonomy-id-sdk/build/sdk/types/sdk/services/blockchain';
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
    private readonly communicationService: CommunicationService,
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

        const issuer = await this.getTonomyOpsIssuer();

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

        const recipientDid = await this.getDid(accountName);

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

  private async getDid(account: string): Promise<string> {
    const chainID = (await getChainInfo()).chain_id.toString();
    return `did:antelope:${chainID}:${account}`;
  }

  private async getTonomyOpsDid(): Promise<string> {
    return this.getDid('ops.tmy');
  }

  private async getTonomyOpsIssuer() {
    const did = await this.getTonomyOpsDid();
    const signer = createSigner(
      PrivateKey.from(settings.secrets.createAccountPrivateKey),
    );

    return {
      did,
      signer,
      alg: 'ES256K-R',
    };
  }
}
