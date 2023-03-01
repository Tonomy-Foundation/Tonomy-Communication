import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { MessageDto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body') {
      return new MessageDto(value.message);
    }
    return value;
  }
}
