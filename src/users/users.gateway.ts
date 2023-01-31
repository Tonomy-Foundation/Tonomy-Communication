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

@UsePipes(
  new ValidationPipe({
    transform: true,
    //   exceptionFactory(validationErrors = []) {
    //     if (this.isDetailedOutputDisabled) {
    //       return new WsException('Bad request');
    //     }
    //     const errors = this.flattenValidationErrors(validationErrors);

    //     return new WsException(errors);
    //   },
  }),
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
    // this.usersService.safeDisconnect(client);
  }

  /**
   * connects notLoggedin user on the website to the app
   * @param connectUserDto the not Loggedin user data needed to connect clients with each other
   * @param client user socket
   * @returns void
   */
  @SubscribeMessage('connectTonomy')
  @AsyncApiPub({
    channel: 'connectTonomy',
    message: {
      payload: ConnectUserDto,
    },
    description: 'Connects Client to the channel',
  })
  connectUser(
    @MessageBody() connectUserDto: ConnectUserDto,
    @ConnectedSocket() client: SocketDto,
  ) {
    this.logger.debug(`user connected to  ${connectUserDto.randomSeed}`);
    const result = this.usersService.register(connectUserDto, client);
    const message = result ? 'succeed' : 'User already registered';
    return { message };
  }

  @SubscribeMessage('sendLoginJwt')
  @AsyncApiPub({
    channel: 'sendLoginJwt',
    message: {
      payload: SendJwtDto,
    },
  })
  sendLoginJwt(
    @MessageBody() data: SendJwtDto,
    @ConnectedSocket() client: SocketDto,
  ) {
    this.usersService.sendLoginJwt(data, client);
  }

  //TODO: change this to connect users based on did:key
  @SubscribeMessage('loginUser')
  @AsyncApiPub({
    channel: 'loginUser',
    message: {
      payload: LoginUserDto,
    },
  })
  loginUser(
    @MessageBody()
    data: LoginUserDto,
    @ConnectedSocket() client: SocketDto,
  ) {
    this.usersService.login(client, data);
  }
}
