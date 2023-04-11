import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { MessageDto, MessageRto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  async transform(value: MessageRto, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      try {
        const message = new MessageDto(value.message);

        const result = await message.verify();

        if (!result)
          throw new HttpException(
            `VC not could not verify signer from ${message.getSender()}`,
            HttpStatus.UNAUTHORIZED,
          );
        return message;
      } catch (e) {
        if (e instanceof HttpException) {
          throw e;
        }

        throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    return value;
  }
}
