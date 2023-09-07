import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  BaseWsExceptionFilter,
} from '@nestjs/websockets';
import { CommunicationService } from './communication.service';
import {
  HttpException,
  HttpStatus,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { TransformVcPipe } from './transform-vc/transform-vc.pipe';
import { MessageDto } from './dto/message.dto';
import { Client } from './dto/client.dto';
import { WsExceptionFilter } from './ws-exception/ws-exception.filter';
import { AuthenticationMessage } from '@tonomy/tonomy-id-sdk';
import { CommunicationGuard } from './communication.guard';

export type WebsocketReturnType = {
  status: HttpStatus;
  details?: any;
  error?: any;
};

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
export class CommunicationGateway implements OnGatewayDisconnect {
  private readonly logger = new Logger(CommunicationGateway.name);
  constructor(private readonly usersService: CommunicationService) { }

  /**
   * Logs in the user and added it to the loggedIn map
   *
   * @param {MessageDto} message - the VC the user sent
   * @param {Client} client - user socket
   * @returns void
   */
  @SubscribeMessage('login')
  async connectUser(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      if (message.getType() !== AuthenticationMessage.getType()) {
        throw new HttpException(
          "Message type must be 'AuthenticationMessage'",
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        status: HttpStatus.OK,
        details: await this.usersService.login(message.getSender(), client),
      };
    } catch (e) {
      return this.usersService.handleError(e);
    }
  }

  /**
   * sends the message to the VC recipient if is connected and loggedIn
   * @param message the VC the user sent
   * @param client user socket
   * @returns void
   */
  @SubscribeMessage('message')
  @UseGuards(CommunicationGuard)
  async relayMessage(
    @MessageBody() message: MessageDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      return {
        status: HttpStatus.OK,
        details: await this.usersService.sendMessage(client, message),
      };
    } catch (e) {
      return this.usersService.handleError(e);
    }
  }

  /**
   * safely disconnect the user from the server when user disconnects
   * @param socket user socket
   */
  handleDisconnect(socket: Client) {
    this.usersService.safeDisconnect(socket);
  }
}
