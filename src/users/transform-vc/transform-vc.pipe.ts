import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { MessageDto } from '../dto/message.dto';

@Injectable()
export class TransformVcPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    return new MessageDto(value);
  }
}
