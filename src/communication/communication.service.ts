import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';
import { WebsocketReturnType } from './communication.gateway';
import { Veriff } from '@veriff/js-sdk';
import Debug from 'debug';
import { VeriffSessionRto } from './dto/veriffService.dto';

const debug = Debug('tonomy-communication:communication:communication.service');

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  private readonly loggedInUsers = new Map<string, Socket['id']>();

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
   * send the message to the right user if user is connected
   * @param socket user socket
   * @param message signed VC
   * @throws if the receiving user isn't online or loggedIn
   * @returns {VeriffSessionRto} Veriff session URL
   */
  async veriffCreateSession(
    socket: Client,
    message: MessageDto,
  ): Promise<VeriffSessionRto> {
    const recipient = this.loggedInUsers.get(message.getRecipient());

    debug(
      'veriffCreateSession()',
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

    const VERIFF_SESSION_TIMEOUT_MS = 5000;
    const url = await new Promise((resolve, reject) => {
      // Request new veriff session
      const veriff = Veriff({
        apiKey: 'API_KEY',
        parentId: 'veriff-root',
        onSession: function (err, response) {
          // received the response, verification can be started / triggered now
          if (err) reject(err);
          resolve(response.verification.url);
        },
      });

      veriff.mount();

      setTimeout(
        () => reject(new Error('Veriff session request timed out')),
        VERIFF_SESSION_TIMEOUT_MS,
      );
    });

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
