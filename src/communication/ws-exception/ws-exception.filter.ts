import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch(WsException, HttpException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const args = host.getArgs();

    // event ack callback
    if ('function' === typeof args[args.length - 1]) {
      const ACKCallback = args.pop();

      ACKCallback({ error: exception.message, exception });
    }
  }
}
