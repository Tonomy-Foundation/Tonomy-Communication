import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import {
  getBaseTokenContract,
  getSettings,
  getTokenContract,
  waitForEvmTrxFinalization,
  decodeTransferTransaction,
  parseSwapMemo,
} from '@tonomy/tonomy-id-sdk';
import { Decimal } from 'decimal.js';
import { tonomySigner } from '../signer';
import { CommunicationGateway } from '../communication/communication.gateway';
import { createDidFromTonomyAppsPlatform } from '../communication/communication.service';
import settings from '../settings';

@Injectable()
export class BaseTokenTransferMonitorService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(BaseTokenTransferMonitorService.name);

  private removeListener?: () => void;
  constructor(private readonly communicationGateway: CommunicationGateway) {}

  async onModuleInit() {
    const contract = getBaseTokenContract();
    const event = contract.getEvent('Transfer');

    const listener = async (
      from: string,
      to: string,
      amount: bigint,
      event: any,
    ) => {
      try {
        const txHash: string = event.log.transactionHash;

        if (to !== settings.config.baseMintBurnAddress) {
          return;
        }

        const { memo } = await decodeTransferTransaction(txHash);

        if (!memo || !memo.startsWith('swap:')) {
          this.logger.debug(
            `Ignoring Transfer event without swap memo: tx ${txHash} to ${to} from ${from} amount ${amount} memo ${memo}`,
          );
          return;
        } else {
          this.logger.debug(
            `Processing Transfer event with swap memo: tx ${txHash} to ${to} from ${from} amount ${amount} memo ${memo}`,
          );
        }

        const { swapId, tonomyAccount } = parseSwapMemo(memo);
        const amountDecimal = new Decimal(amount.toString()).div(
          new Decimal(10).pow(18),
        );
        const antelopeAsset = `${amountDecimal.toFixed(6)} ${getSettings().currencySymbol}`;

        this.logger.log(
          `Transfer detected (pending): tx ${txHash} from ${from} to ${to} amount ${antelopeAsset} memo ${memo}`,
        );

        const did = await createDidFromTonomyAppsPlatform(tonomyAccount);

        await waitForEvmTrxFinalization(txHash);

        this.logger.log(`Transfer finalized: tx ${txHash}`);

        await getTokenContract().bridgeIssue(
          tonomyAccount,
          antelopeAsset,
          `$TONO swap to tonomy ${swapId}`,
          tonomySigner,
        );

        this.logger.log(`Swap completed: tx ${txHash} swapId ${swapId}`);

        // Send notification to wallet via WebSocket
        this.communicationGateway.emitBaseToTonomySwapConfirmation(did, memo);
      } catch (err) {
        this.logger.error('Error processing Transfer event', err as Error);
        // Keep the record even on error so we can track failed attempts
      }
    };

    contract.on(event, listener);
    this.logger.log(
      `Subscribed to Base token Transfer events on address ${await getBaseTokenContract().getAddress()}`,
    );

    this.removeListener = () => {
      try {
        contract.off(event, listener);
        this.logger.log('Unsubscribed from Base token Transfer events');
      } catch (e) {
        this.logger.warn('Failed to remove Transfer listener');
      }
    };
  }

  onApplicationShutdown() {
    if (this.removeListener) this.removeListener();
  }
}
