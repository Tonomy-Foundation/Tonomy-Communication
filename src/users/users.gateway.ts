import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
  BaseWsExceptionFilter,
} from '@nestjs/websockets';
import { UsersService } from './users.service';
import { RegisterUserDto as ConnectUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AsyncApiPub, AsyncApiSub } from 'nestjs-asyncapi';
import { SocketDto } from './dto/socket.dto';
import { SendJwtDto } from './dto/send-jwt-.dto';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';
import { MessageDto } from './dto/message.dto';

@UsePipes(
  new ValidationPipe({
    transform: true,
    exceptionFactory(validationErrors = []) {
      if (this.isDetailedOutputDisabled) {
        return new WsException('Bad request');
      }
      const errors = this.flattenValidationErrors(validationErrors);

      return new WsException(errors);
    },
  }),
  new TransformVcPipe(),
)
@WebSocketGateway({
  cors: {
    origin: '*',
    allowedHeaders: '*',
    credentials: true,
  },
})
export class UsersGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(UsersGateway.name);
  constructor(private readonly usersService: UsersService) {}

  handleDisconnect(client: SocketDto) {
    this.usersService.safeDisconnect(client);
  }

  /**
   * connects notLoggedin user on the website to the app
   * @param connectUserDto the not Loggedin user data needed to connect clients with each other
   * @param client user socket
   * @returns void
   */
  @SubscribeMessage('login')
  @AsyncApiPub({
    channel: 'login',
    message: {
      payload: '',
    },
    description: 'login to the messaging service ',
  })
  connectUser(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: SocketDto,
  ) {
    const result = this.usersService.login(message.getSender(), client.id);
    return result ? 'succeed' : 'You are already loggedIn';
  }

  @SubscribeMessage('message')
  @AsyncApiPub({
    channel: 'message',
    message: {
      payload: ConnectUserDto,
    },
    description: 'send message to client',
  })
  relayMessage(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: SocketDto,
  ) {
    return this.usersService.sendMessage(client, message);
  }
}
