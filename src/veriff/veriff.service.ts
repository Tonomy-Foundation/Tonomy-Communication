import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import * as crypto from 'crypto';
import {
  VerifiableCredentialFactory,
  VeriffWatchlistService,
  getTonomyOpsIssuer,
  getFieldValue,
  signVerifiableCredential,
} from './veriff.helpers';
import { VeriffWebhookPayload, WatchlistScreeningResult } from './veriff.types';

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

  validateSignature(signature: string, payload: VeriffWebhookPayload): boolean {
    const computedSignature = crypto
      .createHmac('sha256', this.VERIFF_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  async validateWebhookRequest(
    signature: string,
    payload: VeriffWebhookPayload,
  ): Promise<void> {
    this.logger.debug('Handling webhook payload from Veriff:', payload);
    const { vendorData: jwt, data, status } = payload;
    if (!jwt) {
      this.logger.warn('vendorData (VC JWT) is missing, cannot proceed.');
      throw new BadRequestException(
        'vendorData (VC JWT) is missing, cannot proceed.',
      );
    }

    // Verify signature
    if (!this.validateSignature(signature, payload)) {
      this.logger.warn('Invalid signature, cannot proceed.');
      throw new UnauthorizedException('Invalid Veriff signature.');
    }

    try {
      const vc = await this.credentialFactory.create<VeriffPayload>(jwt);

      const did = vc.getId();

      if (!did) {
        this.logger.warn('VC is missing DID, cannot proceed.');
        throw new BadRequestException('Verifiable Credential is missing DID.');
      }

      // Check pepSanctionMatches
      if (data.verification.decision === 'approved') {
        try {
          let pepSanctionMatches: WatchlistScreeningResult | undefined;
          if (ENABLE_PEP_CHECK) {
            pepSanctionMatches =
              await this.veriffWatchlistService.getWatchlistScreening(
                payload.sessionId,
              );
            this.logger.debug('Watchlist result:', pepSanctionMatches);
          }
        } catch (e) {
          this.logger.warn('Failed to fetch watchlist screening:', e.message);
          throw new InternalServerErrorException(
            `Veriff webhook processing failed: ${e.message}`,
          );
        }

        const issuer = await getTonomyOpsIssuer();

        const person = data.verification.person;

        const firstName = getFieldValue(person, 'firstName');
        const lastName = getFieldValue(person, 'lastName');
        const birthDate = getFieldValue(person, 'dateOfBirth');
        const nationality = getFieldValue(person, 'nationality');

        if (!firstName || !birthDate || !nationality) {
          throw new Error('Missing required personal data.');
        }

        const signedFirstNameVc = await signVerifiableCredential(
          'FirstNameCredential',
          { firstName },
          issuer,
          did,
        );

        const signedLastNameVc = await signVerifiableCredential(
          'LastNameCredential',
          { lastName },
          issuer,
          did,
        );

        const signedBirthDateVc = await signVerifiableCredential(
          'BirthDateCredential',
          { birthDate },
          issuer,
          did,
        );

        const signedNationalityVc = await signVerifiableCredential(
          'NationalityCredential',
          { nationality },
          issuer,
          did,
        );

        const signedVc = await signVerifiableCredential(
          'VeriffCredential',
          { verification: payload },
          issuer,
          did,
        );

        const mewPayload = JSON.stringify({
          kyc: signedVc,
          firstName: signedFirstNameVc,
          lastName: signedLastNameVc,
          birthDate: signedBirthDateVc,
          nationality: signedNationalityVc,
        });

        this.communicationGateway.sendVeriffVerificationToDid(did, mewPayload);
      } else {
        this.logger.debug(
          'Verification decision is not approved, skipping response data.',
        );
        throw new BadRequestException(
          'Verification decision is not approved, skipping response data.',
        );
      }
    } catch (e) {
      this.logger.error(
        'Failed to process Veriff webhook:',
        e.message,
        e.stack,
      );
      throw new InternalServerErrorException(
        `Veriff webhook processing failed: ${e.message}`,
      );
    }
  }
}
