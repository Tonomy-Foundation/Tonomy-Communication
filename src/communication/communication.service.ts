import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';
import { WebsocketReturnType } from './communication.gateway';
import Veriff from '@veriff/js-sdk';
import Debug from 'debug';
import { VeriffSessionRto } from './dto/veriffService.dto';
import { parseDid, getChainId } from '@tonomy/tonomy-id-sdk';

const debug = Debug('tonomy-communication:communication:communication.service');

const VERIFF_SESSION_TIMEOUT_MS = 5000;

type VeriffSessionData = {
  sessionUrl: string;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  // Map of DID => Websocket ID
  private readonly loggedInUsers = new Map<string, Socket['id']>();
  // Map of DID => Map of App => VeriffSessionData
  private readonly veriffSessions = new Map<
    string,
    Map<string, VeriffSessionData>
  >();

  /**
   * delete the disconnecting user from the users map
   * @param socket user socket
   */
  safeDisconnect(socket: Client) {
    this.loggedInUsers.delete(socket.did);
  }

  /**
   * add user to the loggedIn Map and add user's did to his socket for easier use
   * @param did the user did
   * @param socket user socket
   * @returns boolean if user is connected successfully
   */
  login(did: string, socket: Client): boolean {
    debug('login()', did, socket.id);

    if (this.loggedInUsers.get(did) === socket.id) return false;
    this.loggedInUsers.set(did, socket.id);
    socket.did = did;

    return true;
  }

  /**
   * send the message to the right user if user is connected
   * @param socket user socket
   * @param message signed VC
   * @throws if the receiving user isn't online or loggedIn
   * @returns boolean if message is sent to the user
   */
  sendMessage(socket: Client, message: MessageDto): boolean {
    const recipient = this.loggedInUsers.get(message.getRecipient());

    debug(
      'sendMessage()',
      message.getIssuer(),
      message.getRecipient(),
      message.getType(),
      recipient,
    );

    if (!recipient) {
      // TODO: send via PushNotification and/or use message queue
      throw new HttpException(
        `Recipient not connected ${message.getRecipient()}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // TODO: check that they are using the correct anterlope did method

    // TODO: should check for acknowledgement
    socket.to(recipient).emit('message', message.toString());

    return true;
  }

  /**
   * create a new Veriff session for the user
   * @param socket user socket
   * @param message signed VC with the app information
   * @throws if the app can't be found
   * @returns {VeriffSessionRto} Veriff session URL
   */
  async veriffCreateSession(
    socket: Client,
    message: MessageDto,
  ): Promise<VeriffSessionRto> {
    debug('veriffCreateSession()', message.getIssuer(), message.getType());

    // TODO: check that they are using the correct anterlope did method
    const { method, id, fragment } = parseDid(message.getIssuer());

    if (method !== 'antelope') throw new Error('Must use Antelope DID method');

    if (id.split(':')[0] !== getChainId()) {
      throw new Error(
        `Expected chain id ${getChainId()} but got ${id.split(':')[0]}`,
      );
    }

    // TODO: get the app name & origin and check it is valid
    let appAccountName: string;

    if (!fragment) {
      throw new Error('Expected fragment in DID');
    } else if (fragment === 'active') {
      appAccountName = '';
    } else {
      appAccountName = fragment;
    }

    // Request new veriff session
    const { url, id: sessionId } = await new Promise<{
      url: string;
      id: string;
    }>((resolve, reject) => {
      const veriff = Veriff({
        apiKey: 'API_KEY',
        parentId: 'veriff-root',
        onSession: function (err, response) {
          // received the response, verification can be started / triggered now
          if (err) reject(err);
          debug('Veriff session response', JSON.stringify(response, null, 2));
          resolve({
            url: response.verification.url,
            id: response.verification.id,
          });
        },
      });

      veriff.mount();

      setTimeout(
        () => reject(new Error('Veriff session request timed out')),
        VERIFF_SESSION_TIMEOUT_MS,
      );
    });

    const now = new Date();
    const sessionData: VeriffSessionData = {
      sessionUrl: url,
      sessionId: sessionId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    let accountSessions = this.veriffSessions.get(message.getIssuer());

    if (!accountSessions)
      accountSessions = new Map<string, VeriffSessionData>();
    accountSessions.set(appAccountName, sessionData);
    this.veriffSessions.set(message.getIssuer(), accountSessions);

    // TODO: send a report somewhere to let us know the app requested a session (for billing)

    return { url };
  }

  handleError(e): WebsocketReturnType {
    debug('handleError()', e);

    if (e instanceof HttpException) {
      throw e;
    }

    throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
