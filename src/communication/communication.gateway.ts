import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  BaseWsExceptionFilter,
  WebSocketServer,
  OnGatewayInit,
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
import { Client } from './dto/client.dto';
import { WsExceptionFilter } from './ws-exception/ws-exception.filter';
import {
  AuthenticationMessage,
  VerificationMessage,
} from '@tonomy/tonomy-id-sdk';
import { CommunicationGuard } from './communication.guard';
import { BodyDto } from './dto/body.dto';
import { Server } from 'socket.io';
import { SwapBodyDto } from './dto/swapBody.dto';
import { FaucetBodyDto } from './dto/faucetBody.dto';

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
export class CommunicationGateway
  implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CommunicationGateway.name);
  constructor(private readonly usersService: CommunicationService) { }

  afterInit(server: Server) {
    this.usersService.setServer(server);
  }

  /**
   * Logs in the user and added it to the loggedIn map
   *
   * @param {BodyDto} body - The message VC or an error from the transformer
   * @param {Client} client - user socket
   */
  @SubscribeMessage('v1/login')
  async connectUser(
    @MessageBody() body: BodyDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      if (body.error) throw body.error;
      if (!body.value) throw new Error('Body not found');
      const message = body.value;

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
   * @param {BodyDto} body - The message VC or an error from the transformer
   * @param client user socket
   */
  @SubscribeMessage('v1/message/relay/send')
  @UseGuards(CommunicationGuard)
  async relayMessage(
    @MessageBody() body: BodyDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      if (body.error) throw body.error;
      if (!body.value) throw new Error('Body not found');
      const message = body.value;

      return {
        status: HttpStatus.OK,
        details: await this.usersService.sendMessage(client, message),
      };
    } catch (e) {
      return this.usersService.handleError(e);
    }
  }

  /**
   * Swaps the $TONO token from Base-chain to Tonomy blockchain
   * @param {SwapBodyDto} body - The swap token message VC or an error from the transformer
   * @param client user socket
   */
  @SubscribeMessage('v2/swap/token/tono')
  @UseGuards(CommunicationGuard)
  async swapTokenTonomyToBase(
    @MessageBody() body: SwapBodyDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      if (body.error) throw body.error;
      if (!body.value) throw new Error('Body not found');
      const message = body.value;

      return {
        status: HttpStatus.OK,
        details: await this.usersService.swapTokenTonomyToBase(client, message),
      };
    } catch (e) {
      return this.usersService.handleError(e);
    }
  }

  /**
   * Requests testnet tokens from the faucet
   * @param {FaucetBodyDto} body - The faucet token message VC or an error from the transformer
   * @param client user socket
   */
  @SubscribeMessage('v1/faucet/token/tono')
  @UseGuards(CommunicationGuard)
  async requestFaucetToken(
    @MessageBody() body: FaucetBodyDto,
    @ConnectedSocket() client: Client,
  ) {
    try {
      if (body.error) throw body.error;
      if (!body.value) throw new Error('Body not found');
      const message = body.value;

      return {
        status: HttpStatus.OK,
        details: await this.usersService.requestFaucetToken(client, message),
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

  sendVeriffVerificationToDid(did: string, payload: VerificationMessage) {
    try {
      this.usersService.sendVeriffToDid(did, payload);
    } catch (err) {
      this.logger.error(`Failed to send veriff to ${did}: ${err.message}`);
    }
  }

  emitBaseToTonomySwapConfirmation(did: string, memo: string) {
    try {
      this.usersService.emitBaseToTonomySwapConfirmation(did, memo);
    } catch (err) {
      this.logger.error(
        `Failed to send swap from base to tonomy ${memo}: ${err.message}`,
      );
    }
  }
}
