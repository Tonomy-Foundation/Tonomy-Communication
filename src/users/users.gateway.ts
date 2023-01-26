import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { Socket } from 'socket.io';
import { LoginUserDto } from './dto/login-user.dto';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';

@WebSocketGateway()
export class UsersGateway implements OnGatewayConnection {
  constructor(
    private readonly usersService: UsersService,
    private logger: Logger,
  ) {}

  handleConnection() {
    return 'hello world';
  }

  @SubscribeMessage('registerUser')
  registerUser(
    @MessageBody() registerUserDto: RegisterUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log(registerUserDto.randomSeed);
    this.logger.debug(registerUserDto);
    return this.usersService.register(registerUserDto, client);
  }

  @SubscribeMessage('loginUser')
  loginUser(
    @MessageBody()
    data: LoginUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.usersService.login(client, data);
  }

  // @SubscribeMessage('findAllUsers')
  // findAll() {
  //   return this.usersService.findAll();
  // }

  // @SubscribeMessage('updateUser')
  // update(@MessageBody() updateUserDto: UpdateUserDto) {
  //   return this.usersService.update(updateUserDto.id, updateUserDto);
  // }

  // @SubscribeMessage('removeUser')
  // remove(@MessageBody() id: number) {
  //   return this.usersService.remove(id);
  // }
}
