import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { MessageDto, MessageRto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  async transform(value: MessageRto, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      try {
        const message = new MessageDto(value.message);

        const result = await message.verify();

        if (!result) throw new WsException('VC not Authorized');
        return message;
      } catch (e) {
        throw new WsException(e);
      }
    }

    return value;
  }
}
