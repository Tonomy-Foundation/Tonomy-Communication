// veriff.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { VeriffService, VeriffPayload } from './veriff.service';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { jest } from '@jest/globals';
import { CommunicationService } from '../communication/communication.service';
import { CommunicationGateway } from '../communication/communication.gateway';
import {
  VerifiableCredentialFactory,
  AccountNameHelper,
  VeriffWatchlistService,
} from './veriff.helpers';
import { setSettings, VeriffWebhookPayload } from '@tonomy/tonomy-id-sdk';
import settings from '../settings';

// Constants
const accountName = 'paccountname';
const did = `did:antelope:abcdefghijklmnopqrstuvwxyz:${accountName}`;
const appName = 'Tonomy ID';

const jwt =
  'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo6cGFjY291bnRuYW1lIiwianRpIjoiZGlkOmFudGVsb3BlOmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6OnBhY2NvdW50bmFtZSIsIm5iZiI6MTc0NzIwNDk1MiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiYXBwTmFtZSI6IlRvbm9teSBJRCJ9LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.1WAAQaQV0wcm459ubmTDYynoCiOO0gYIG4um5Tecp4YzwPxws4HmuozqJZG4ICmU-Lqh2AmiG0pNybnLkwya2gA';

const getAccountName = (did: string): string => did.split(':').pop()!;

// Mocks
const mockGetAccountNameFromDid = jest.fn((didArg: string) => {
  if (didArg === getAccountName(did)) return accountName;
  return null;
});

const mockVerify = jest.fn<() => Promise<void>>();
const mockGetCredentialSubject = jest.fn<() => Promise<VeriffPayload>>();
const mockGetId = jest.fn<() => string | undefined>();
const mockGetAccount = jest.fn().mockReturnValue(accountName);

const mockVCInstance = {
  getCredentialSubject: mockGetCredentialSubject,
  getId: mockGetId,
  getAccount: mockGetAccount,
};

const mockAccountNameHelper = {
  getAccountNameFromDid: jest.fn().mockReturnValue(accountName),
};

const mockWatchlistService = {
  getWatchlistScreening: jest.fn(),
};

const mockFactory = {
  create: jest.fn().mockReturnValue(mockVCInstance),
};

jest.mock('@tonomy/tonomy-id-sdk', () => ({
  getAccountNameFromDid: mockGetAccountNameFromDid,
  util: {
    VerifiableCredential: jest.fn(),
  },
}));

describe('VeriffService', () => {
  let service: VeriffService;
  let mockCommunicationService: Partial<CommunicationService>;
  let mockCommunicationGateway: Partial<CommunicationGateway>;

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  beforeEach(async () => {
    mockCommunicationService = {
      getLoggedInUser: jest.fn((did: string) => 'mock-socket-id'),
    };

    mockCommunicationGateway = {
      sendVeriffVerificationToDid: jest.fn(
        (recipientDid: string, payload: string) => true,
      ),
    };

    await setSettings({
      blockchainUrl: settings.config.blockchainUrl,
      loggerLevel: settings.config.loggerLevel,
    });

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeriffService,
        { provide: VerifiableCredentialFactory, useValue: mockFactory },
        { provide: AccountNameHelper, useValue: mockAccountNameHelper },
        { provide: VeriffWatchlistService, useValue: mockWatchlistService },
        { provide: Logger, useValue: mockLogger },
        {
          provide: CommunicationService,
          useValue: mockCommunicationService,
        },
        {
          provide: CommunicationGateway,
          useValue: mockCommunicationGateway,
        },
      ],
    }).compile();

    // Default mocks
    mockVerify.mockResolvedValue(undefined);
    mockGetCredentialSubject.mockResolvedValue({ appName });
    mockGetId.mockReturnValue(did);
    mockGetAccount.mockReturnValue(accountName);

    service = module.get<VeriffService>(VeriffService);

    Object.defineProperty(service, 'VERIFF_SECRET', {
      value: 'default_secret',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateSignature', () => {
    it('should return true for a valid signature', () => {
      const payload: any = { data: 'test' };
      const expectedSignature = crypto
        .createHmac('sha256', 'default_secret')
        .update(JSON.stringify(payload))
        .digest('hex');
      const isValid = service.validateSignature(expectedSignature, payload);

      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const payload: any = { data: 'test' };
      const invalidSignature = 'invalid_signature';
      const isValid = service.validateSignature(invalidSignature, payload);

      expect(isValid).toBe(false);
    });
  });

  describe('validateWebhookRequest', () => {
    const mockPayload: VeriffWebhookPayload = {
      vendorData: jwt,
      status: 'success',
      eventType: 'fullauto',
      sessionId: 'some-id',
      attemptId: 'another-id',
      endUserId: null,
      version: '1.0.0',
      acceptanceTime: new Date().toISOString(),
      time: new Date().toISOString(),
      data: {
        verification: {
          decisionScore: 1,
          decision: 'approved',
          person: {
            firstName: {
              confidenceCategory: 'high',
              value: 'John',
              sources: ['VIZ'],
            },
            lastName: {
              confidenceCategory: 'high',
              value: 'Doe',
              sources: ['MRZ'],
            },
            dateOfBirth: {
              confidenceCategory: 'high',
              value: '1990-01-01', // Added required field
              sources: ['MRZ'],
            },
            nationality: {
              confidenceCategory: 'high',
              value: 'US', // Added required field
              sources: ['MRZ'],
            },
          },
          document: {
            type: {
              confidenceCategory: 'high',
              value: 'PASSPORT',
              sources: ['VIZ'],
            },
            country: {
              confidenceCategory: 'high',
              value: 'US',
              sources: ['MRZ'],
            },
            number: {
              confidenceCategory: 'high',
              value: '123456789',
              sources: ['VIZ'],
            },
          },
          insights: [],
        },
      },
    };
    const validSignature = crypto
      .createHmac('sha256', 'default_secret')
      .update(JSON.stringify(mockPayload))
      .digest('hex');

    // it('should successfully validate a valid webhook request', async () => {
    //   mockGetId.mockReturnValue(did);

    //   const result = await service.validateWebhookRequest(
    //     validSignature,
    //     mockPayload,
    //   );

    //   expect(result).toBeUndefined();
    //   expect(mockFactory.create).toHaveBeenCalledWith(jwt);
    //   expect(mockGetId).toHaveBeenCalledTimes(1);
    //   expect(mockLogger.debug).toHaveBeenCalledWith(
    //     'Handling webhook payload from Veriff:',
    //     mockPayload,
    //   );
    //   // Add this if sendVeriffVerificationToDid is called
    //   expect(
    //     mockCommunicationGateway.sendVeriffVerificationToDid,
    //   ).toHaveBeenCalledWith(did, expect.any(String));
    // });

    it('should throw BadRequestException if vendorData is missing', async () => {
      const payloadWithoutVendorData = { ...mockPayload, vendorData: null };

      await expect(
        service.validateWebhookRequest(
          validSignature,
          payloadWithoutVendorData,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'vendorData (VC JWT) is missing, cannot proceed.',
      );
    });

    it('should throw UnauthorizedException for an invalid signature', async () => {
      const invalidSignature = 'invalid_signature';

      await expect(
        service.validateWebhookRequest(invalidSignature, mockPayload),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid signature, cannot proceed.',
      );
    });

    it('should throw BadRequestException if did is missing in VC', async () => {
      mockGetId.mockReturnValue(undefined);

      await expect(
        service.validateWebhookRequest(validSignature, mockPayload),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'VC is missing DID, cannot proceed.',
      );
    });
  });
});
