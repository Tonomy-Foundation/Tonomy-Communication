import { MessageDto } from './message.dto';

export class BodyDto {
  value?: MessageDto;
  error?: Error | any;
}
