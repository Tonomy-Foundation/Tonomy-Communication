import { Test, TestingModule } from '@nestjs/testing';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { jest } from '@jest/globals';

type ValidateWebhookResult = { accountName: string; appName: string };

// Mock the VeriffService
const mockVeriffService = {
  validateWebhookRequest: jest.fn(),
} as Partial<VeriffService>;

describe('VeriffController', () => {
  let controller: VeriffController;
  let service: VeriffService;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeriffController],
      providers: [{ provide: VeriffService, useValue: mockVeriffService }],
    }).compile();

    controller = module.get<VeriffController>(VeriffController);
    service = module.get<VeriffService>(VeriffService);
    mockResponse = {
      status: jest.fn<(code: number) => Response>().mockReturnThis(),
      send: jest.fn<(body?: any) => Response>(),
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    const mockHeaders = {
      'x-hmac-signature':
        '5019c05866ab3423bec643201059847a8cf0db78bfb88ea9fb96ca7213bf4461',
    };
    const mockBody = {
      status: 'success',
      eventType: 'fullauto',
      sessionId: '3bc0d2e8-b2c3-4b64-bdbd-92558c7ff9c6',
      attemptId: '2a11c5b1-e01e-42d8-88f3-979b45691e8e',
      vendorData: 'p1g1oijcnilg',
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
              value: 'JEKIN',
              sources: ['MRZ', 'VIZ'],
            },
            lastName: {
              confidenceCategory: 'high',
              value: 'GOHEL',
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
              value: 'M6218778',
              sources: ['MRZ', 'VIZ'],
            },
            type: { value: 'passport' },
            country: { value: 'IN' },
            validUntil: {
              confidenceCategory: 'high',
              value: '2025-02-12',
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
          insights: [
            { label: 'allowedIpLocation', result: 'yes', category: 'fraud' },
            { label: 'documentAccepted', result: 'yes', category: 'document' },
            {
              label: 'documentBackFullyVisible',
              result: 'notApplicable',
              category: 'document',
            },
            {
              label: 'documentBackImageAvailable',
              result: 'notApplicable',
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

    it('should call veriffService.validateWebhookRequest and return 200 OK', async () => {
      const mockAccountName = 'testaccount';
      const mockAppName = 'test-app';
      (
        mockVeriffService.validateWebhookRequest as jest.Mock<
          (signature: string, payload: any) => Promise<ValidateWebhookResult>
        >
      ).mockResolvedValue({
        accountName: mockAccountName,
        appName: mockAppName,
      });

      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {}); // Mock implementation to avoid actual logging

      await controller.handleWebhook(
        mockHeaders['x-hmac-signature'],
        mockBody,
        mockResponse as Response,
      );

      expect(service.validateWebhookRequest).toHaveBeenCalledWith(
        mockHeaders['x-hmac-signature'],
        mockBody,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Webhook received for',
        mockAccountName,
        'from app',
        mockAppName,
      );

      consoleLogSpy.mockRestore(); // Clean up the mock after the test
    });

    it('should handle errors thrown by veriffService.validateWebhookRequest', async () => {
      const errorMessage = 'Invalid signature';
      const errorStatus = HttpStatus.UNAUTHORIZED;

      // Explicitly cast mockVeriffService.validateWebhookRequest and its rejection type
      (
        mockVeriffService.validateWebhookRequest as jest.Mock<
          (signature: string, payload: any) => Promise<ValidateWebhookResult>
        >
      ).mockRejectedValue(new HttpException(errorMessage, errorStatus));

      try {
        await controller.handleWebhook(
          mockHeaders['x-hmac-signature'],
          mockBody,
          mockResponse as Response,
        );
      } catch (error) {
        expect(service.validateWebhookRequest).toHaveBeenCalledWith(
          mockHeaders['x-hmac-signature'],
          mockBody,
        );
        expect(error).toBeInstanceOf(HttpException);
        expect(error.message).toBe(errorMessage);
        expect(error.getStatus()).toBe(errorStatus);
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.send).not.toHaveBeenCalled();
      }
    });
  });
});
