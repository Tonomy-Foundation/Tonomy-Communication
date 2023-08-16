import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  CreateAccountRequestKey,
  CreateAccountRequest,
  CreateAccountResponse,
} from './dto/create-account.dto';
import { Checksum256, Name, PrivateKey } from '@wharfkit/antelope';
import settings from 'src/settings';
import { PushTransactionResponse } from '@wharfkit/antelope/src/api/v1/types';
import {
  IDContract,
  EosioUtil,
  AntelopePushTransactionError,
} from '@tonomy/tonomy-id-sdk';
import { verify } from 'hcaptcha';

const idContract = IDContract.Instance;

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  async createAccount(
    createAccountRequest: CreateAccountRequest,
  ): Promise<CreateAccountResponse> {
    this.logger.debug('createAccount()');

    if (!createAccountRequest)
      throw new HttpException(
        'CreateAccountRequest not provided',
        HttpStatus.BAD_REQUEST,
      );
    if (!createAccountRequest.usernameHash)
      throw new HttpException(
        'UsernameHash not provided',
        HttpStatus.BAD_REQUEST,
      );
    if (
      !createAccountRequest.keys ||
      !Array.isArray(createAccountRequest.keys) ||
      createAccountRequest.keys.length === 0
    )
      throw new HttpException('Keys not provided', HttpStatus.BAD_REQUEST);
    if (!createAccountRequest.salt)
      throw new HttpException('Salt not provided', HttpStatus.BAD_REQUEST);
    if (!createAccountRequest.captchaToken)
      throw new HttpException(
        'Captcha token not provided',
        HttpStatus.BAD_REQUEST,
      );

    const verifyResponse = await verify(
      settings.secrets.hCaptchaSecret,
      createAccountRequest.captchaToken,
    );

    if (!verifyResponse.success)
      throw new HttpException(
        {
          message: 'Captcha verification failed',
          errors: verifyResponse['error-codes'],
        },
        HttpStatus.BAD_REQUEST,
      );

    const usernameHash = Checksum256.from(createAccountRequest.usernameHash);

    const passwordKey = createAccountRequest.keys.find(
      (k: CreateAccountRequestKey) => k.level === 'PASSWORD',
    );

    if (!passwordKey)
      throw new HttpException(
        'Password key not provided',
        HttpStatus.BAD_REQUEST,
      );

    const idTonomyActiveKey = PrivateKey.from(
      settings.secrets.createAccountPrivateKey,
    );

    const salt = createAccountRequest.salt;

    let res: PushTransactionResponse;

    try {
      res = await idContract.newperson(
        usernameHash.toString(),
        passwordKey.toString(),
        salt.toString(),
        EosioUtil.createSigner(idTonomyActiveKey),
      );
    } catch (e) {
      if (
        e instanceof AntelopePushTransactionError &&
        e.hasErrorCode(3050003) &&
        e.hasTonomyErrorCode('TCON1000')
      ) {
        throw new HttpException(
          'Username is already taken',
          HttpStatus.BAD_REQUEST,
        );
      }

      throw e;
    }

    const newAccountAction =
      res.processed.action_traces[0].inline_traces[0].act;

    const accountName = Name.from(newAccountAction.data.name);

    if (settings.config.loggerLevel === 'debug')
      this.logger.debug('createAccount()', accountName.toString());

    return {
      transactionId: 'eae',
      accountName: accountName.toString(),
    };
  }
}
