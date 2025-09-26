import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

@Catch(WsException, HttpException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  logger = new Logger(WsExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const args = host.getArgs();

    if (typeof args[args.length - 2] === 'function') {
      this.logger.debug('ACKCallback found');

      const ACKCallback = args[args.length - 2];

      ACKCallback({ error: exception?.message, exception });
    }
  }
}
