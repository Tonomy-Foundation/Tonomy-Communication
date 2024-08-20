import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import Debug from 'debug';
import { Socket } from 'socket.io-client';

const debug = Debug('tonomy-communication:communication:ws-exception.filter');

@Catch(WsException, HttpException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const args = host.getArgs();

    if (typeof args[args.length - 2] === 'function') {
      debug('ACKCallback found');

      const ACKCallback = args[args.length - 2];

      ACKCallback({ error: exception?.message, exception });
    }
  }
}
