// veriff.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { VeriffService, VeriffPayload } from './veriff.service';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { util } from '@tonomy/tonomy-id-sdk';
import { jest } from '@jest/globals';

// Provided variables
const did =
  'did:antelope:8a34ec7df1b8cd06ff4a8abbaa7cc50300823350cadc59ab296cb00d104d2b8f:p1g1oijcnilg';
const appName = 'Tonomy ID Testnet';
const accountName = 'p1g1oijcnilg';
const jwt =
  'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6OGEzNGVjN2RmMWI4Y2QwNmZmNGE4YWJiYWE3Y2M1MDMwMDgyMzM1MGNhZGM1OWFiMjk2Y2IwMGQxMDRkMmI4ZjpwMWcxb2lqY25pbGcjbG9jYWwiLCJqdGkiOiJkaWQ6YW50ZWxvcGU6OGEzNGVjN2RmMWI4Y2QwNmZmNGE4YWJiYWE3Y2M1MDMwMDgyMzM1MGNhZGM1OWFiMjk2Y2IwMGQxMDRkMmI4ZjpwMWcxb2lqY25pbGciLCJuYmYiOjE3NDcxMzY0NjAsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImFwcE5hbWUiOiJUb25vbXkgSUQgVGVzdG5ldCJ9LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.mMj1mB8bIy1tjjHqmaSzV0GVv3MVGitZKGzgQA4fq8QlhCYUXII_qAj9uA4MfV5XZ8nLybjqh7sxHpX2awvghQE';

// Mock the getAccountNameFromDid function
const mockGetAccountNameFromDid = jest.fn((didArg: string) => {
  if (didArg === did.split(':')[4]) {
    // Extract account name from did
    return accountName;
  }
  return null;
});

const mockVerify = jest.fn<() => Promise<void>>();
const mockGetCredentialSubject = jest.fn<() => Promise<VeriffPayload>>();
const mockGetId = jest.fn<() => string | undefined>();

const MockVerifiableCredential = jest.fn(() => ({
  verify: mockVerify,
  getCredentialSubject: mockGetCredentialSubject,
  getId: mockGetId,
}));

jest.mock('@tonomy/tonomy-id-sdk', () => ({
  getAccountNameFromDid: mockGetAccountNameFromDid,
  util: {
    VerifiableCredential: MockVerifiableCredential,
  },
}));

describe('VeriffService', () => {
  let service: VeriffService;
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [VeriffService, { provide: Logger, useValue: mockLogger }],
    }).compile();

    service = module.get<VeriffService>(VeriffService);
    Object.defineProperty(service, 'VERIFF_SECRET', {
      value: 'default_secret',
    });

    mockVerify.mockReset();
    mockGetCredentialSubject.mockReset();
    mockGetId.mockReset();
    MockVerifiableCredential.mockClear();
    mockGetAccountNameFromDid.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSignature', () => {
    it('should return true for a valid signature', () => {
      const payload = { data: 'test' };
      const expectedSignature = crypto
        .createHmac('sha256', 'default_secret')
        .update(JSON.stringify(payload))
        .digest('hex');
      const isValid = service.validateSignature(expectedSignature, payload);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const payload = { data: 'test' };
      const invalidSignature = 'invalid_signature';
      const isValid = service.validateSignature(invalidSignature, payload);
      expect(isValid).toBe(false);
    });
  });

  describe('validateWebhookRequest', () => {
    const mockPayload = {
      vendorData: jwt,
    };
    const validSignature = crypto
      .createHmac('sha256', 'default_secret')
      .update(JSON.stringify(mockPayload))
      .digest('hex');

    it('should successfully validate a valid webhook request', async () => {
      mockVerify.mockResolvedValue(undefined);
      mockGetCredentialSubject.mockResolvedValue({ appName });
      mockGetId.mockReturnValue(did);

      const result = await service.validateWebhookRequest(
        validSignature,
        mockPayload,
      );
      expect(result).toEqual({ accountName, appName });
      expect(MockVerifiableCredential).toHaveBeenCalledWith(jwt);
      expect(mockVerify).toHaveBeenCalledTimes(1);
      expect(mockGetCredentialSubject).toHaveBeenCalledTimes(1);
      expect(mockGetId).toHaveBeenCalledTimes(1);
      expect(mockGetAccountNameFromDid).toHaveBeenCalledWith(did.split(':')[4]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Handling webhook payload from Veriff:',
        mockPayload,
      );
    });

    it('should throw BadRequestException if vendorData is missing', async () => {
      await expect(
        service.validateWebhookRequest(validSignature, {}),
      ).rejects.toThrowError(
        new HttpException(
          'vendorData (VC JWT) is missing',
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Handling webhook payload from Veriff:',
        {},
      );
      expect(MockVerifiableCredential).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for an invalid signature', async () => {
      const invalidSignature = 'invalid_signature';
      await expect(
        service.validateWebhookRequest(invalidSignature, mockPayload),
      ).rejects.toThrowError(
        new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Handling webhook payload from Veriff:',
        mockPayload,
      );
      expect(MockVerifiableCredential).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if VC verification fails', async () => {
      mockVerify.mockRejectedValueOnce(new Error('VC verification failed'));

      await expect(
        service.validateWebhookRequest(validSignature, mockPayload),
      ).rejects.toThrowError(
        new HttpException(
          'VC verification failed: VC verification failed',
          HttpStatus.UNAUTHORIZED,
        ),
      );
      expect(MockVerifiableCredential).toHaveBeenCalledWith(jwt);
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if did is missing in VC', async () => {
      mockVerify.mockResolvedValue(undefined);
      mockGetCredentialSubject.mockResolvedValue({ appName });
      mockGetId.mockReturnValue(undefined);

      await expect(
        service.validateWebhookRequest(validSignature, mockPayload),
      ).rejects.toThrowError(
        new HttpException('Invalid did', HttpStatus.BAD_REQUEST),
      );
      expect(MockVerifiableCredential).toHaveBeenCalledWith(jwt);
      expect(mockVerify).toHaveBeenCalledTimes(1);
      expect(mockGetCredentialSubject).toHaveBeenCalledTimes(1);
      expect(mockGetId).toHaveBeenCalledTimes(1);
    });

    it('should handle a case where getAccountNameFromDid returns null', async () => {
      mockVerify.mockResolvedValue(undefined);
      mockGetCredentialSubject.mockResolvedValue({ appName });
      mockGetId.mockReturnValue('invalid_did');
      mockGetAccountNameFromDid.mockReturnValueOnce(null);

      const result = await service.validateWebhookRequest(
        validSignature,
        mockPayload,
      );
      expect(result).toEqual({ accountName: 'null', appName });
      expect(MockVerifiableCredential).toHaveBeenCalledWith(jwt);
      expect(mockVerify).toHaveBeenCalledTimes(1);
      expect(mockGetCredentialSubject).toHaveBeenCalledTimes(1);
      expect(mockGetId).toHaveBeenCalledTimes(1);
      expect(mockGetAccountNameFromDid).toHaveBeenCalledWith(
        'invalid_did'.split(':')[4],
      );
    });
  });
});
