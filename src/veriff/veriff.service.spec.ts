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
import {
  setSettings,
  VeriffWebhookPayload,
  VerificationMessage,
} from '@tonomy/tonomy-id-sdk';
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
        (recipientDid: string, payload: VerificationMessage) => true,
      ),
    };

    await setSettings({
      blockchainUrl: settings.config.blockchainUrl,
      loggerLevel: settings.config.loggerLevel,
      baseTokenAddress: settings.config.baseTokenAddress,
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
      status: 'success',
      eventType: 'fullauto',
      sessionId: '7ad83f3b-8af0-4028-8a92-6a191c248b3b',
      attemptId: '7bc6a3f4-096d-42d9-8e93-0c2f82b635a1',
      vendorData:
        'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6OGEzNGVjN2RmMWI4Y2QwNmZmNGE4YWJiYWE3Y2M1MDMwMDgyMzM1MGNhZGM1OWFiMjk2Y2IwMGQxMDRkMmI4Zjpwc3RsbG9mcHFhNGYjbG9jYWwiLCJqdGkiOiJkaWQ6YW50ZWxvcGU6OGEzNGVjN2RmMWI4Y2QwNmZmNGE4YWJiYWE3Y2M1MDMwMDgyMzM1MGNhZGM1OWFiMjk2Y2IwMGQxMDRkMmI4Zjpwc3RsbG9mcHFhNGYiLCJuYmYiOjE3NTI1MTAzMTYsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImFwcE5hbWUiOiJUb25vbXkgSUQgRGV2ZWxvcG1lbnQifSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCJdfX0.KNXYTux8bCxz5FGei82HT-0e4buAuZVBfPYGoMFl3L5KRKzjajWfdxpOe6VRXK-aPz5Ryl2nfbM2_7FzaqRPYwA',
      endUserId: null,
      version: '1.0.0',
      acceptanceTime: '2025-07-14T16:25:18.064121Z',
      time: '2025-07-14T16:26:00.754Z',
      data: {
        verification: {
          decisionScore: 1,
          decision: 'approved',
          person: {
            firstName: {
              confidenceCategory: 'high',
              value: 'SADIA ABBAS',
              sources: ['VIZ'],
            },
            lastName: { confidenceCategory: null, value: null, sources: [] },
            dateOfBirth: {
              confidenceCategory: 'high',
              value: '1994-04-04',
              sources: ['VIZ'],
            },
            gender: {
              confidenceCategory: 'high',
              value: 'F',
              sources: ['VIZ'],
            },
            idNumber: {
              confidenceCategory: 'high',
              value: '37405-4676115-4',
              sources: ['VIZ'],
            },
            nationality: { confidenceCategory: null, value: null, sources: [] },
            address: {
              confidenceCategory: null,
              value: null,
              components: {},
              sources: [],
            },
            placeOfBirth: null,
            foreignerStatus: null,
            occupation: null,
            employer: null,
            extraNames: null,
          },
          document: {
            number: {
              confidenceCategory: 'high',
              value: '37405-4676115-4',
              sources: ['VIZ'],
            },
            type: { value: 'id_card' },
            country: { value: 'PK' },
            validUntil: {
              confidenceCategory: 'high',
              value: '2030-11-06',
              sources: ['VIZ'],
            },
            validFrom: {
              confidenceCategory: 'high',
              value: '2020-11-06',
              sources: ['VIZ'],
            },
            firstIssue: null,
            placeOfIssue: null,
            processNumber: null,
            residencePermitType: null,
            licenseNumber: null,
          },
          insights: [
            { label: 'allowedIpLocation', result: 'yes', category: 'fraud' },
            { label: 'documentAccepted', result: 'yes', category: 'document' },
            {
              label: 'documentBackFullyVisible',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentBackImageAvailable',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentFrontFullyVisible',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentFrontImageAvailable',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentImageQualitySufficient',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentNotExpired',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'documentRecognised',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'expectedTrafficBehaviour',
              result: 'yes',
              category: 'fraud',
            },
            {
              label: 'faceImageAvailable',
              result: 'yes',
              category: 'biometric',
            },
            {
              label: 'faceImageQualitySufficient',
              result: 'yes',
              category: 'biometric',
            },
            { label: 'faceLiveness', result: 'yes', category: 'biometric' },
            {
              label: 'faceNotInBlocklist',
              result: 'yes',
              category: 'biometric',
            },
            {
              label: 'faceSimilarToPortrait',
              result: 'yes',
              category: 'biometric',
            },
            {
              label: 'physicalDocumentPresent',
              result: 'yes',
              category: 'document',
            },
            {
              label: 'validDocumentAppearance',
              result: 'yes',
              category: 'document',
            },
          ],
        },
      },
    };
    const validSignature = crypto
      .createHmac('sha256', 'default_secret')
      .update(JSON.stringify(mockPayload))
      .digest('hex');

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
  });
});
