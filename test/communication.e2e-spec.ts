import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { connectSocket, emitMessage } from './ws-client.helper';
import { Socket } from 'socket.io-client';
import {
  AuthenticationMessage,
  generateRandomKeyPair,
  util,
} from '@tonomy/tonomy-id-sdk';

describe('CommunicationGateway (e2e)', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0);
    const server: any = app.getHttpServer();
    const port: number = server.address().port;

    socket = await connectSocket(port);
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
