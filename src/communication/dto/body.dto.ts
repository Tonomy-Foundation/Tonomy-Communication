import { MessageDto } from './message.dto';

export class BodyDto {
    value?: MessageDto | undefined;
    error?: Error | any | undefined;
}
