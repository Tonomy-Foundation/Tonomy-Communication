import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';
import { WebsocketReturnType } from './communication.gateway';
import Debug from 'debug';
import { Server } from 'socket.io';

const debug = Debug('tonomy-communication:communication:communication.service');

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  private readonly loggedInUsers = new Map<string, Socket['id']>();
  private server!: Server;

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * delete the disconnecting user from the users map
   * @param socket user socket
   */
  safeDisconnect(socket: Client) {
    this.loggedInUsers.delete(socket.did);
  }

  /**
   * Get the socket ID of a logged-in user by their DID
   * @param did the user DID
   * @returns socket ID if user is logged in, undefined otherwise
   */
  getLoggedInUser(did: string): string {
    try {
      const socketId = this.loggedInUsers.get(did);
      if (socketId === undefined) {
        throw new Error(`User with DID ${did} not found`);
      }
      return socketId;
    } catch (e) {
      throw e;
    }
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
    } else {
      // TODO: should check for acknowledgement
      socket.to(recipient).emit('message', message.toString());
    }

    return true;
  }

  sendEventToUser(did: string, event: string, payload: any): boolean {
    const socketId = this.loggedInUsers.get(did);
    if (!socketId) {
      this.logger.warn(`User ${did} is not connected`);
      return false;
    }
    this.server.to(socketId).emit(event, payload);
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
