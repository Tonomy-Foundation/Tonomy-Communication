import { FaucetTokenMessage } from '@tonomy/tonomy-id-sdk';

export class FaucetBodyDto {
    value?: FaucetTokenMessage;
    error?: Error | any;
    asset?: string; // Format: "1.000000 TONO"
}
