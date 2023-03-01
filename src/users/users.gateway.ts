import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  WsException,
  BaseWsExceptionFilter,
} from '@nestjs/websockets';
import { UsersService } from './users.service';
import { Socket } from 'socket.io';
import { Catch, Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { AsyncApiPub, AsyncApiSub } from 'nestjs-asyncapi';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';
import { MessageDto } from './dto/message.dto';

@UsePipes(
  // new ValidationPipe({
  //   transform: true,

  //   exceptionFactory(validationErrors = []) {
  //     if (this.isDetailedOutputDisabled) {
  //       return new WsException('Bad request');
  //     }
  //     const errors = flattenValidationErrors(validationErrors);

  //     return new WsException(errors);
  //   },
  // }),
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

  handleDisconnect(client: Socket) {
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
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.usersService.login(message.getSender(), client.id);
    return result ? 'succeed' : 'You are already loggedIn';
  }

  @SubscribeMessage('message')
  @AsyncApiPub({
    channel: 'message',
    message: {
      payload: '',
    },
    description: 'send message to client',
  })
  relayMessage(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    return this.usersService.sendMessage(client, message);
  }
}
