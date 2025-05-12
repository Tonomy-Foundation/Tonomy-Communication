import { VeriffService } from './veriff.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';

jest.mock('@tonomy/tonomy-id-sdk', () => {
  const actual = jest.requireActual('@tonomy/tonomy-id-sdk');

  class MockVerifiableCredential {
    verify = jest.fn().mockResolvedValue(undefined);
    getCredentialSubject = jest.fn().mockResolvedValue({ appName: 'MyApp' });
    getId = jest.fn().mockReturnValue('did:tonomy:eos:myaccount');
  }

  return {
    ...actual,
    util: {
      ...actual.util,
      VerifiableCredential: MockVerifiableCredential,
    },
    getAccountNameFromDid: jest.fn().mockReturnValue('myaccount'),
  };
});

describe('VeriffService', () => {
  let service: VeriffService;

  beforeEach(() => {
    service = new VeriffService();
  });

  it('should validate and return accountName and appName', async () => {
    const payload = {
      vendorData: 'mock-jwt',
    };

    const signature = crypto
      .createHmac('sha256', service['VERIFF_SECRET'])
      .update(JSON.stringify(payload))
      .digest('hex');

    const result = await service.validateWebhookRequest(signature, payload);
    expect(result).toEqual({ accountName: 'myaccount', appName: 'MyApp' });
  });
});
