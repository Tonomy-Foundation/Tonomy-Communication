import { Injectable } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  @WebSocketServer()
  private server: Server;

  register(createUserDto: RegisterUserDto, socket: Socket) {
    socket.join(createUserDto.randomSeed.toString());
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: string): Socket {
    return this.server.sockets.sockets.get(id);
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  login(client: Socket, data: LoginUserDto) {
    client.to(data.randomSeed.toString()).emit('loggedIn', data);
    client.join(data.username);
    client.leave(data.randomSeed.toString());
    client.rooms[data.randomSeed.toString()];
  }
}
