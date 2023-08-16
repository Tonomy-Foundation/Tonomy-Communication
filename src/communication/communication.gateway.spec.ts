import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationGateway } from './communication.gateway';
import { CommunicationService } from './communication.service';

describe('CommunicationGateway', () => {
  let gateway: CommunicationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommunicationGateway, CommunicationService],
    }).compile();

    gateway = module.get<CommunicationGateway>(CommunicationGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
