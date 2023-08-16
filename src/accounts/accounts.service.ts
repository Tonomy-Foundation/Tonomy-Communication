import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateAccountRequest,
  CreateAccountResponse,
} from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  async createAccount(
    createAccountDto: CreateAccountRequest,
    response: Response,
  ): Promise<CreateAccountResponse> {
    // const { keyManager } = this;
    // const username = await this.getUsername();

    // const usernameHash = username.usernameHash;

    // const passwordKey = await keyManager.getKey({
    //   level: KeyManagerLevel.PASSWORD,
    // });

    // // TODO this needs to change to the actual key used, from settings
    // const idTonomyActiveKey = PrivateKey.from(
    //   'PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V',
    // );

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
