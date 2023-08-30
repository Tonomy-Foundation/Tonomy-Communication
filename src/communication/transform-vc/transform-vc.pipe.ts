import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { MessageDto, MessageRto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  async transform(value: MessageRto, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      const message = new MessageDto(value.message);

      try {
        const result = await message.verify();

        if (!result)
          throw new HttpException(
            `VC not could not verify signer from ${message.getSender()}`,
            HttpStatus.UNAUTHORIZED,
          );
        return message;
      } catch (e) {
        if (
          e.message?.startsWith(
            'resolver_error: Unable to resolve DID document for',
          )
        ) {
          throw new HttpException(
            `DID could not be resolved from ${message.getSender()}`,
            HttpStatus.NOT_FOUND,
          );
        }

        if (e instanceof HttpException) {
          throw e;
        }

        throw new HttpException(e, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    return value;
  }
}
