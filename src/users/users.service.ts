import { Injectable, NotFoundException } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { SendJwtDto } from './dto/send-jwt-.dto';
import { SocketDto } from './dto/socket.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  safeDisconnect(socket: Socket) {
    this.unRegisteredSockets.delete(socket.id);
  }
  private readonly unRegisteredSockets = new Map<Socket['id'], string>();
  private readonly loggedInUsers = new Map<string, Socket['id']>();
  @WebSocketServer()
  private server: Server;

  /**
   *
   * @param createUserDto
   * @param socket
   * @returns boolean if the user registered or already registered
   */
  register(createUserDto: RegisterUserDto, socket: SocketDto): boolean {
    const seed = createUserDto.randomSeed;
    if (this.unRegisteredSockets.get(socket.id)) return false;
    this.unRegisteredSockets.set(socket.id, seed);
    socket.join(seed);
    socket.broadcast.to(seed).emit('connectTonomy', { message: 'connected' });
    return true;
  }

  sendLoginJwt(data: SendJwtDto, socket: SocketDto) {
    const room = this.unRegisteredSockets.get(socket.id);
    if (!room) return false;
    socket.to(room).emit('sendLoginJwt', data);
  }

  login(client: SocketDto, data: LoginUserDto): boolean {
    const room = this.unRegisteredSockets.get(client.id);
    if (room) {
      client.leave(room);
    }
    client.platform = data.client;
    this.loggedInUsers.set(data.client + '@' + data.username, client.id);
    return true;
  }
}
