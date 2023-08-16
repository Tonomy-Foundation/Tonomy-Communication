import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AsyncApiSub, AsyncApi } from 'nestjs-asyncapi';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto, MessageRto } from './dto/message.dto';

@AsyncApi()
@Injectable()
export class CommunicationService {
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
    if (process.env.LOG === 'true') console.log('login()', did, socket.id);

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
  @AsyncApiSub({
    channel: 'message',
    message: {
      payload: MessageRto,
    },
    description: 'receive message from client',
  })
  sendMessage(socket: Client, message: MessageDto): boolean {
    const recipient = this.loggedInUsers.get(message.getRecipient());

    if (process.env.LOG === 'true')
      console.log(
        'sendMessage()',
        message.getIssuer(),
        message.getRecipient(),
        message.getType(),
        recipient,
      );

    if (!recipient) {
      // TODO send via PushNotification and/or use message queue
      throw new HttpException(
        `Recipient not connected ${message.getRecipient()}`,
        HttpStatus.BAD_REQUEST,
      );
    } else {
      // TODO should check for acknowledgement
      socket.to(recipient).emit('message', message.toString());
    }

    return true;
  }
}
