import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';
import { WebsocketReturnType } from './communication.gateway';
import Debug from 'debug';
import { Server } from 'socket.io';
import { VerificationMessage, SwapTokenMessage } from '@tonomy/tonomy-id-sdk';

const debug = Debug('tonomy-communication:communication:communication.service');

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  private readonly loggedInUsers = new Map<string, Socket['id']>();
  private readonly userSockets = new Map<string, Client>();

  private server!: Server;

  setServer(server: Server) {
    this.server = server;
  }
  /**
   * delete the disconnecting user from the users map
   * @param socket user socket
   */
  safeDisconnect(socket: Client) {
    if (socket.did) {
      this.loggedInUsers.delete(socket.did);
      this.userSockets.delete(socket.did);
      this.logger.debug(`User ${socket.did} disconnected`);
    }
  }

  /**
   * Get the socket ID of a logged-in user by their DID
   * @param did the user DID
   * @returns socket ID if user is logged in, undefined otherwise
   */
  getLoggedInUser(did: string): string {
    const socketId = this.loggedInUsers.get(did);

    if (socketId === undefined) {
      throw new Error(`User with DID ${did} not found`);
    }

    return socketId;
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
    this.userSockets.set(did, socket);
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
    } else {
      // TODO: should check for acknowledgement
      socket.to(recipient).emit('v1/message/relay/receive', message.toString());
    }

    return true;
  }

  /**
   * Swaps the $TONO token from Base-chain to Tonomy blockchain
   * @param {Client} socket user socket
   * @param {SwapTokenMessage} message signed VC
   * @throws if the receiving user isn't online or loggedIn
   * @returns boolean if message is sent to the user
   */
  swapToken(socket: Client, message: SwapTokenMessage): boolean {
    const payload = message.getPayload();

    debug('swapToken()', message.getIssuer(), payload, message.getType());

    // it should verify base proof
    // then it should try burn tokens from the from account
    // then it should mint tokens to the to account

    return true;
  }

  /**
   * Send a 'veriff' event to a specific user by DID
   * @param did recipient DID
   * @param payload data to send
   * @throws if user is not connected
   */
  sendVeriffToDid(did: string, payload: VerificationMessage): boolean {
    const socket = this.userSockets.get(did);

    if (!socket) {
      this.logger.warn(`Veriff: User with DID ${did} is not connected`);
      throw new HttpException(
        `User with DID ${did} is not connected`,
        HttpStatus.BAD_REQUEST,
      );
    }

    socket.emit('v1/verification/veriff/receive', payload);
    this.logger.debug(
      `Sent 'veriff' to DID ${did}: ${JSON.stringify(payload)}`,
    );
    return true;
  }

  handleError(e): WebsocketReturnType {
    debug('handleError()', e);

    if (e instanceof HttpException) {
      throw e;
    }

    throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
