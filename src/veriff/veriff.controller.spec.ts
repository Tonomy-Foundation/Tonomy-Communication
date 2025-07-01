import { Test, TestingModule } from '@nestjs/testing';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { jest } from '@jest/globals';
import { VeriffWebhookPayload } from '@tonomy/tonomy-id-sdk';

type ValidateWebhookResult = { accountName: string; appName: string } | null;

// Mock the VeriffService
const mockVeriffService = {
  validateWebhookRequest: jest.fn(
    (signature: string, payload: VeriffWebhookPayload) => Promise.resolve(),
  ),
};

const mockLogger = {
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
} as unknown as Logger;

describe('VeriffController', () => {
  let controller: VeriffController;
  let service: VeriffService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeriffController],
      providers: [
        { provide: VeriffService, useValue: mockVeriffService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<VeriffController>(VeriffController);
    service = module.get<VeriffService>(VeriffService);
    mockResponse = {
      status: jest.fn<(code: number) => Response>().mockReturnThis(),
      send: jest.fn<(body?: any) => Response>(),
    };

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    const mockHeaders = {
      'x-hmac-signature':
        'ec6870d0eee993dd50d702bc430333ed15bd4c87c74421d1b617b27f8e5e7155',
    };
    const mockBody: VeriffWebhookPayload = {
      status: 'success',
      eventType: 'fullauto',
      sessionId: '3bc0d2e8-b2c3-4b64-bdbd-92558c7ff9c6',
      attemptId: '2a11c5b1-e01e-42d8-88f3-979b45691e8e',
      vendorData:
        'eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkaWQ6YW50ZWxvcGU6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo6cGFjY291bnRuYW1lIiwianRpIjoiZGlkOmFudGVsb3BlOmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6OnBhY2NvdW50bmFtZSIsIm5iZiI6MTc0NzIwNDk1MiwidmMiOnsiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiYXBwTmFtZSI6IlRvbm9teSBJRCJ9LCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl19fQ.1WAAQaQV0wcm459ubmTDYynoCiOO0gYIG4um5Tecp4YzwPxws4HmuozqJZG4ICmU-Lqh2AmiG0pNybnLkwya2gA',
      endUserId: null,
      version: '1.0.0',
      acceptanceTime: '2025-02-12T04:04:20.670849Z',
      time: '2025-02-12T04:05:13.035Z',
      data: {
        verification: {
          decisionScore: 1,
          decision: 'approved',
          person: {
            firstName: {
              confidenceCategory: 'high',
              value: 'Test',
              sources: ['MRZ', 'VIZ'],
            },
            lastName: {
              confidenceCategory: 'high',
              value: 'Test',
              sources: ['MRZ', 'VIZ'],
            },
            dateOfBirth: {
              confidenceCategory: 'high',
              value: '1991-02-12',
              sources: ['MRZ', 'VIZ'],
            },
            gender: {
              confidenceCategory: 'high',
              value: 'M',
              sources: ['MRZ', 'VIZ'],
            },
            idNumber: { confidenceCategory: null, value: null, sources: [] },
            nationality: {
              confidenceCategory: 'high',
              value: 'IN',
              sources: ['MRZ', 'VIZ'],
            },
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
              value: 'M123456789',
              sources: ['MRZ', 'VIZ'],
            },
            type: { value: 'passport' },
            country: { value: 'IN' },
            validUntil: {
              confidenceCategory: 'high',
              value: '2028-02-12',
              sources: ['MRZ', 'VIZ'],
            },
            validFrom: {
              confidenceCategory: 'high',
              value: '2015-02-13',
              sources: ['VIZ'],
            },
            firstIssue: null,
            placeOfIssue: null,
            processNumber: null,
            residencePermitType: null,
            licenseNumber: null,
          },
          insights: [],
        },
      },
    };

    it('should call veriffService.validateWebhookRequest and return 200 OK', async () => {
      mockVeriffService.validateWebhookRequest.mockResolvedValue(undefined);

      await controller.handleWebhook(
        mockHeaders['x-hmac-signature'],
        mockBody,
        mockResponse as Response,
      );

      expect(mockVeriffService.validateWebhookRequest).toHaveBeenCalledWith(
        mockHeaders['x-hmac-signature'],
        mockBody,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Handling webhook payload from Veriff',
      );
    });

    it('should throw and not respond if validateWebhookRequest fails', async () => {
      const errorMessage = 'Invalid signature';
      const errorStatus = HttpStatus.UNAUTHORIZED;

      mockVeriffService.validateWebhookRequest.mockRejectedValue(
        new HttpException(errorMessage, errorStatus),
      );

      await expect(() =>
        controller.handleWebhook(
          mockHeaders['x-hmac-signature'],
          mockBody,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      expect(mockVeriffService.validateWebhookRequest).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle errors thrown by veriffService.validateWebhookRequest', async () => {
      const errorMessage = 'Invalid signature';
      const errorStatus = HttpStatus.UNAUTHORIZED;

      // Configure the mock to reject with an HttpException
      mockVeriffService.validateWebhookRequest.mockRejectedValue(
        new HttpException(errorMessage, errorStatus),
      );

      await expect(
        controller.handleWebhook(
          mockHeaders['x-hmac-signature'],
          mockBody,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      expect(mockVeriffService.validateWebhookRequest).toHaveBeenCalledWith(
        mockHeaders['x-hmac-signature'],
        mockBody,
      );
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should throw if verification decision is not approved', async () => {
      // Create a new body object to avoid mutating the original mockBody
      const declinedBody = {
        ...mockBody,
        data: {
          ...mockBody.data,
          verification: {
            ...mockBody.data.verification,
            decision: 'declined',
          },
        },
      };

      // Configure the existing mock to reject with BadRequestException
      mockVeriffService.validateWebhookRequest.mockRejectedValue(
        new BadRequestException('Verification not approved'),
      );

      await expect(
        controller.handleWebhook(
          mockHeaders['x-hmac-signature'],
          declinedBody,
          mockResponse as Response,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
