import { Injectable } from '@nestjs/common';
import {
  EosioUtil,
  getAccountNameFromDid as sdkGetAccountNameFromDid,
  verifyClientAuthorization,
} from '@tonomy/tonomy-id-sdk';
import crypto from 'crypto';
import {
  VerifiedClientAuthorization,
  WatchlistScreeningResult,
} from './veriff.types';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Checksum256 } from '@wharfkit/antelope';
import { tonomyIssuerSigner } from 'src/signer';

// --------- Verifiable Credential Factory ---------
@Injectable()
export class VerifiableCredentialFactory {
  async create<T extends object>(
    jwt: string,
  ): Promise<VerifiedClientAuthorization> {
    // This will throw if verification fails
    return await verifyClientAuthorization<T>(jwt, {
      verifyUsername: false,
      verifyOrigin: false,
      verifyChainId: false,
    });
  }
}

// --------- Account Name Resolver ---------
@Injectable()
export class AccountNameHelper {
  getAccountNameFromDid(did: string): string {
    return sdkGetAccountNameFromDid(did)?.toString() ?? 'null';
  }
}

// --------- Signature Generator ---------
export function generateSignature(
  payload: string | object | Buffer,
  secret: string,
): string {
  let bufferPayload: Buffer;

  if (Buffer.isBuffer(payload)) {
    bufferPayload = payload;
  } else if (typeof payload === 'object') {
    bufferPayload = Buffer.from(JSON.stringify(payload), 'utf8');
  } else if (typeof payload === 'string') {
    bufferPayload = Buffer.from(payload, 'utf8');
  } else {
    throw new Error('Invalid payload type for signature generation');
  }

  return crypto
    .createHmac('sha256', secret)
    .update(bufferPayload)
    .digest('hex');
}

// --------- Watchlist Service ---------
@Injectable()
export class VeriffWatchlistService {
  private readonly veriffApiKey = process.env.VERIFF_API_KEY || 'default_key';
  private readonly veriffSecret = process.env.VERIFF_SECRET || 'default_secret';
  private readonly veriffBaseURL =
    process.env.VERIFF_BASE_URL || 'https://stationapi.veriff.com';

  constructor(private readonly httpService: HttpService) {}

  async getWatchlistScreening(
    sessionId: string,
  ): Promise<WatchlistScreeningResult> {
    const headers = {
      'x-auth-client': this.veriffApiKey,
      'x-hmac-signature': generateSignature(sessionId, this.veriffSecret),
      'content-type': 'application/json',
    };

    const url = `${this.veriffBaseURL}/v1/sessions/${sessionId}/watchlist-screening`;

    const response$ = this.httpService.get(url, { headers });
    const { data: result } = await lastValueFrom(response$);

    const {
      attemptId,
      sessionId: resSessionId,
      vendorData,
      endUserId,
      matchStatus,
      checkType,
      searchTerm,
      totalHits,
      createdAt,
      hits,
    } = result.data;

    return {
      attemptId,
      sessionId: resSessionId,
      vendorData,
      endUserId,
      matchStatus,
      checkType,
      searchTerm,
      totalHits,
      createdAt,
      hits,
    };
  }
}

export async function getDid(account: string): Promise<string> {
  const chainID = (await EosioUtil.getChainInfo())
    .chain_id as unknown as Checksum256;

  return `did:antelope:${chainID}:${account}`;
}

export async function getTonomyOpsDid(): Promise<string> {
  return getDid('ops.tmy');
}

export async function getTonomyOpsIssuer() {
  const did = (await getTonomyOpsDid()) + '#active';

  return {
    did,
    signer: tonomyIssuerSigner,
    alg: 'ES256K-R',
  };
}
