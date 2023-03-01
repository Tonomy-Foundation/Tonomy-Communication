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
import { MessageDto, MessageRto } from './dto/message.dto';
import { Client } from './dto/client.dto';

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

  /**
   * connects notLoggedin user on the website to the app
   * @param connectUserDto the not Loggedin user data needed to connect clients with each other
   * @param client user socket
   * @returns void
   */
  @SubscribeMessage('login')
  // @AsyncApiPub({
  //   channel: 'login',
  //   message: {
  //     payload: '',
  //   },
  //   description: 'login to the messaging service ',
  // })
  connectUser(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Client,
  ) {
    return this.usersService.login(message.getSender(), client);
  }

  @SubscribeMessage('message')
  @AsyncApiPub({
    channel: 'message',
    message: {
      payload: MessageRto,
    },
    description:
      'send message to client the message must be signed VC having a recipient',
  })
  relayMessage(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Client,
  ) {
    return this.usersService.sendMessage(client, message);
  }

  handleDisconnect(socket: Client) {
    this.usersService.safeDisconnect(socket);
  }
}
