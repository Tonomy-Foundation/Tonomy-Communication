import { Test, TestingModule } from '@nestjs/testing';
import { VeriffController } from './veriff.controller';
import { VeriffService } from './veriff.service';
import { Response } from 'express';
import { jest } from '@jest/globals';

describe('VeriffController', () => {
  let controller: VeriffController;
  let service: VeriffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VeriffController],
      providers: [
        {
          provide: VeriffService,
          useValue: {
            validateWebhookRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VeriffController>(VeriffController);
    service = module.get<VeriffService>(VeriffService);
  });

  it('should return 200 OK on valid request', async () => {
    const signature = 'mock-sig';
    const body = { vendorData: 'mock-jwt' };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest
      .spyOn(service, 'validateWebhookRequest')
      .mockResolvedValue({ accountName: 'user123', appName: 'myApp' });

    await controller.handleWebhook(signature, body, res);

    expect(service.validateWebhookRequest).toHaveBeenCalledWith(
      signature,
      body,
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
  });
});
