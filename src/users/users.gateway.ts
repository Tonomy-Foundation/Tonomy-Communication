import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  BaseWsExceptionFilter,
} from '@nestjs/websockets';
import { UsersService } from './users.service';
import {
  HttpException,
  HttpStatus,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AsyncApiPub } from 'nestjs-asyncapi';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';
import { MessageDto, MessageRto } from './dto/message.dto';
import { Client } from './dto/client.dto';
import { WsExceptionFilter } from './ws-exception/ws-exception.filter';
import { AuthenticationMessage } from '@tonomy/tonomy-id-sdk';
import { UsersGuard } from './users.guard';

@UseFilters(WsExceptionFilter)
@UsePipes(new TransformVcPipe())
@WebSocketGateway({
  cors: {
    origin: '*',
    allowedHeaders: '*',
    credentials: true,
  },
})
@UseFilters(new BaseWsExceptionFilter())
export class UsersGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(UsersGateway.name);
  constructor(private readonly usersService: UsersService) {}

  /**
   * Logs in the user and added it to the loggedIn map
   *
   * @param {MessageDto} message - the VC the user sent
   * @param {Client} client - user socket
   * @returns void
   */
  @SubscribeMessage('login')
  @AsyncApiPub({
    channel: 'login',
    message: {
      payload: MessageRto,
    },
    description: 'login to the messaging service ',
  })
  connectUser(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Client,
  ) {
    if (message.getType() !== AuthenticationMessage.getType()) {
      throw new HttpException(
        "Message type must be 'AuthenticationMessage'",
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.usersService.login(message.getSender(), client);
  }

  /**
   * sends the message to the VC recipient if is connected and loggedIn
   * @param message the VC the user sent
   * @param client user socket
   * @returns void
   */
  @SubscribeMessage('message')
  @UseGuards(UsersGuard)
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
    console.log('sent message', message.getRecipient(), message.getType());

    return this.usersService.sendMessage(client, message);
  }

  /**
   * safely disconnect the user from the server when user disconnects
   * @param socket user socket
   */
  handleDisconnect(socket: Client) {
    this.usersService.safeDisconnect(socket);
  }
}
