import { Injectable, NotFoundException } from '@nestjs/common';
import { AsyncApiSub, AsyncApi } from 'nestjs-asyncapi';
import { Socket } from 'socket.io';
import { MessageDto } from './dto/message.dto';

@AsyncApi()
@Injectable()
export class UsersService {
  private readonly loggedInUsers = new Map<string, Socket['id']>();

  safeDisconnect(socket: Socket) {
    const key = this.getByValue(this.loggedInUsers, socket.id);
    this.loggedInUsers.delete(key);
  }

  login(did: string, socketId: Socket['id']): boolean {
    if (this.loggedInUsers.get(did)) return false;
    this.loggedInUsers.set(did, socketId);
    return true;
  }

  @AsyncApiSub({
    channel: 'message',
    message: {
      payload: '',
    },
    description: 'receive message from client',
  })
  sendMessage(socket: Socket, message: MessageDto) {
    const recipient = this.loggedInUsers.get(message.getRecipient());
    if (!recipient) throw new NotFoundException();
    socket.to(recipient).emit('message', message.jwt);
    return 'message sent';
  }

  private getByValue(map, searchValue) {
    for (const [key, value] of map.entries()) {
      if (value === searchValue) return key;
    }
  }
}
