import { Injectable, NotFoundException } from '@nestjs/common';
import { AsyncApiSub, AsyncApi } from 'nestjs-asyncapi';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';

@AsyncApi()
@Injectable()
export class UsersService {
  private readonly loggedInUsers = new Map<string, Socket['id']>();

  safeDisconnect(socket: Client) {
    this.loggedInUsers.delete(socket.did);
  }

  login(did: string, socket: Client): boolean {
    if (this.loggedInUsers.get(did)) return false;
    this.loggedInUsers.set(did, socket.id);
    socket.did = did;
    return true;
  }

  // @AsyncApiSub({
  //   channel: 'message',
  //   message: {
  //     payload: '',
  //   },
  //   description: 'receive message from client',
  // })
  sendMessage(socket: Client, message: MessageDto): boolean {
    const recipient = this.loggedInUsers.get(message.getRecipient());
    if (!recipient) throw new NotFoundException();
    socket.to(recipient).emit('message', message.jwt);
    return true;
  }
}
