import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { connectSocket, emitMessage } from './ws-client.helper';
import { Socket } from 'socket.io-client';
import {
  AuthenticationMessage,
  ES256KSigner,
  generateRandomKeyPair,
  setSettings,
} from '@tonomy/tonomy-id-sdk';
// @ts-expect-error - cannot find module or its corresponding type declarations
import { createJWK, toDid } from '@tonomy/tonomy-id-sdk/util';

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
      await expect(() => emitMessage(socket, 'login', {})).rejects.toThrow(
        "Cannot read properties of undefined (reading 'getCredentialSubject')",
      );
    });

    it('succeeds for did:jwk message', async () => {
      const { privateKey, publicKey } = generateRandomKeyPair();
      const signer = ES256KSigner(privateKey.data.array, true);
      const jwk = await createJWK(publicKey);
      const did = toDid(jwk);

      const issuer = {
        did,
        signer,
        alg: 'ES256K-R',
      };
      const message = await AuthenticationMessage.signMessageWithoutRecipient(
        { data: 'test' },
        issuer,
      );

      const response = await emitMessage(socket, 'login', { message });

      expect(response).toBeTruthy();
    });
  });
});
