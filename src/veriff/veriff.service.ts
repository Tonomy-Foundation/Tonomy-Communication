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
} from './veriff.helpers';
import { WatchlistScreeningResult } from './veriff.types';
import {
  KYCVC,
  FirstNameVC,
  BirthDateVC,
  AddressVC,
  NationalityVC,
  VeriffWebhookPayload,
  VerificationMessage,
  VerificationMessagePayload,
  LastNameVC,
} from '@tonomy/tonomy-id-sdk';
import { CommunicationGateway } from '../communication/communication.gateway';
import settings from '../settings';

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

  validateSignature(signature: string, payload: VeriffWebhookPayload): boolean {
    const computedSignature = crypto
      .createHmac('sha256', settings.secrets.veriffSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  async validateWebhookRequest(
    signature: string,
    webhookPayload: VeriffWebhookPayload,
  ): Promise<void> {
    this.logger.debug('Handling webhook payload from Veriff:', webhookPayload);

    const { vendorData, data } = webhookPayload;

    if (!vendorData) {
      this.logger.warn('vendorData (VC JWT) is missing, cannot proceed.');
      throw new BadRequestException(
        'vendorData (VC JWT) is missing, cannot proceed.',
      );
    }

    // Verify signature
    if (!this.validateSignature(signature, webhookPayload)) {
      this.logger.warn('Invalid signature, cannot proceed.');
      throw new UnauthorizedException('Invalid Veriff signature.');
    }

    const factory = new VerifiableCredentialFactory();

    const verifiedVC = await factory.create(vendorData);

    const subject = verifiedVC.did;

    if (!subject) {
      this.logger.warn('VC is missing DID, cannot proceed.');
      throw new BadRequestException('Verifiable Credential is missing DID.');
    }

    this.logger.debug(
      `Verified the origin did of the veriff verification: ${subject}`,
    );

    const issuer = await getTonomyOpsIssuer();
    const signedVc = await KYCVC.signData(webhookPayload, issuer, {
      subject,
    });

    if (data.verification.decision === 'approved') {
      if (ENABLE_PEP_CHECK) {
        try {
          const pepSanctionMatches: WatchlistScreeningResult | undefined =
            await this.veriffWatchlistService.getWatchlistScreening(
              webhookPayload.sessionId,
            );

          this.logger.debug('Watchlist result:', pepSanctionMatches);
        } catch (e) {
          this.logger.warn('Failed to fetch watchlist screening:', e.message);
          throw new InternalServerErrorException(
            `Veriff webhook processing failed: ${e.message}`,
          );
        }
      }

      const person = data.verification.person;

      const firstName = person.firstName?.value;
      const lastName = person.lastName?.value;
      const birthDate = person.dateOfBirth?.value;
      const address = person.address?.value;
      const components = person.address?.components;
      const nationality = person.nationality?.value;

      let signedFirstNameVc: FirstNameVC | undefined;
      let signedLastNameVc: LastNameVC | undefined;
      let signedAddressVc: AddressVC | undefined;
      let signedNationalityVc: NationalityVC | undefined;
      let signedBirthDateVc: BirthDateVC | undefined;

      if (firstName) {
        signedFirstNameVc = await FirstNameVC.signData({ firstName }, issuer, {
          subject,
        });
      }

      if (lastName) {
        signedLastNameVc = await LastNameVC.signData({ lastName }, issuer, {
          subject,
        });
      }

      if (birthDate) {
        signedBirthDateVc = await BirthDateVC.signData({ birthDate }, issuer, {
          subject,
        });
      }

      if (address && components) {
        signedAddressVc = await AddressVC.signData(
          { address, components },
          issuer,
          {
            subject,
          },
        );
      }

      if (nationality) {
        signedNationalityVc = await NationalityVC.signData(
          { nationality },
          issuer,
          { subject },
        );
      }

      const payload: VerificationMessagePayload = {
        kyc: signedVc,
        ...(signedFirstNameVc && { firstName: signedFirstNameVc }),
        ...(signedLastNameVc && { lastName: signedLastNameVc }),
        ...(signedBirthDateVc && { birthDate: signedBirthDateVc }),
        ...(signedAddressVc && { address: signedAddressVc }),
        ...(signedNationalityVc && { nationality: signedNationalityVc }),
      };

      const verificationMessage = await VerificationMessage.signMessage(
        payload,
        issuer,
        subject,
        { subject },
      );

      this.communicationGateway.sendVeriffVerificationToDid(
        subject,
        verificationMessage,
      );
    } else {
      this.logger.debug(
        'Verification decision is not approved, skipping response data.',
      );

      const payload: VerificationMessagePayload = {
        kyc: signedVc,
      };

      const verificationMessage = await VerificationMessage.signMessage(
        payload,
        issuer,
        subject,
        { subject },
      );

      this.communicationGateway.sendVeriffVerificationToDid(
        subject,
        verificationMessage,
      );
    }
  }
}
