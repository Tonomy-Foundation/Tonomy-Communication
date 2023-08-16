import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  CreateAccountRequestKey,
  CreateAccountRequest,
  CreateAccountResponse,
} from './dto/create-account.dto';
import { Checksum256, PrivateKey } from '@wharfkit/antelope';
import settings from 'src/settings';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  async createAccount(
    createAccountRequest: CreateAccountRequest,
    response: Response,
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
    if (!createAccountRequest.keys)
      throw new HttpException('Keys not provided', HttpStatus.BAD_REQUEST);

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

    // const salt = await this.storage.salt;
    // let res: PushTransactionResponse;

    // try {
    //   res = await idContract.newperson(
    //     usernameHash.toString(),
    //     passwordKey.toString(),
    //     salt.toString(),
    //     createSigner(idTonomyActiveKey),
    //   );
    // } catch (e) {
    //   if (e instanceof AntelopePushTransactionError) {
    //     if (e.hasErrorCode(3050003) && e.hasTonomyErrorCode('TCON1000')) {
    //       throw throwError('Username is taken', SdkErrors.UsernameTaken);
    //     }
    //   }

    //   throw e;
    // }

    // const newAccountAction =
    //   res.processed.action_traces[0].inline_traces[0].act;

    // this.storage.accountName = Name.from(newAccountAction.data.name);
    // await this.storage.accountName;

    // this.storage.status = UserStatus.CREATING_ACCOUNT;
    // await this.storage.status;
    // await this.createDid();

    // if (getSettings().loggerLevel === 'debug') {
    //   console.log('Created account', {
    //     accountName: await this.storage.accountName,
    //     username: (await this.getUsername()).getBaseUsername(),
    //     did: await this.getDid(),
    //   });
    // }

    const res = {
      transactionId: 'eae',
    };

    // @ts-expect-error status is not callable
    return response.status(HttpStatus.CREATED).send(res);
  }
}
