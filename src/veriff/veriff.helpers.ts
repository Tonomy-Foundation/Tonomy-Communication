import { Injectable } from '@nestjs/common';
import {
  util,
  getAccountNameFromDid as sdkGetAccountNameFromDid,
} from '@tonomy/tonomy-id-sdk';
import axios from 'axios';
import crypto from 'crypto';
import { WatchlistScreeningResult } from './veriff.types';

// --------- Verifiable Credential Factory ---------
@Injectable()
export class VerifiableCredentialFactory {
  create<T extends object>(jwt: string): util.VerifiableCredential<T> {
    return new util.VerifiableCredential<T>(jwt);
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

  async getWatchlistScreening(
    sessionId: string,
  ): Promise<WatchlistScreeningResult> {
    const headers = {
      'x-auth-client': this.veriffApiKey,
      'x-hmac-signature': generateSignature(sessionId, this.veriffSecret),
      'content-type': 'application/json',
    };

    const url = `${this.veriffBaseURL}/v1/sessions/${sessionId}/watchlist-screening`;

    const { data: result } = await axios.get(url, { headers });

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
