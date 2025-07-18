import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { connectSocket, emitMessage } from './ws-client.helper';
import { Socket } from 'socket.io-client';
import {
  AuthenticationMessage,
  generateRandomKeyPair,
  setSettings,
  util,
} from '@tonomy/tonomy-id-sdk';

setSettings({
  blockchainUrl: 'http://localhost:8888',
});

describe('CommunicationGateway (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.listen(5000);

    socket = await connectSocket();
  });

  afterEach(async () => {
    await socket.disconnect();
    await socket.close();
    await app.close();
  });

  describe('login event', () => {
    it('fails when provide an empty body', async () => {
      await expect(() => emitMessage(socket, 'v1/login', {})).rejects.toThrow(
        "Cannot read properties of undefined (reading 'getCredentialSubject')",
      );
    });

    it('succeeds for did:key message', async () => {
      const { privateKey } = generateRandomKeyPair();
      const issuer = await util.toDidKeyIssuer(privateKey);

      const message = await AuthenticationMessage.signMessageWithoutRecipient(
        { data: 'test' },
        issuer,
      );

      const response = await emitMessage(socket, 'v1/login', { message });

      expect(response).toBeTruthy();
    });
  });
});
