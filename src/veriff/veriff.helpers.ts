// veriff.helpers.ts
import { Injectable } from '@nestjs/common';
import {
  util,
  getAccountNameFromDid as sdkGetAccountNameFromDid,
} from '@tonomy/tonomy-id-sdk';

@Injectable()
export class VerifiableCredentialFactory {
  create<T extends object>(jwt: string): util.VerifiableCredential<T> {
    return new util.VerifiableCredential<T>(jwt);
  }
}

@Injectable()
export class AccountNameHelper {
  getAccountNameFromDid(did: string): string {
    return sdkGetAccountNameFromDid(did)?.toString() ?? 'null';
  }
}
