import { SwapTokenMessage } from '@tonomy/tonomy-id-sdk';

export class SwapBodyDto {
  value?: SwapTokenMessage;
  error?: Error | any;
}
