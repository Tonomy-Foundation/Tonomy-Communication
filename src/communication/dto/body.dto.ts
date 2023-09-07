import { MessageDto } from './message.dto';

export type BodyDto = {
    value?: MessageDto;
    error?: any;
};
