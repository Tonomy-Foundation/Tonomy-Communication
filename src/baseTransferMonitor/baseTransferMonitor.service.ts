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
  waitForTonomyTrxFinalization,
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

        this.logger.debug(
          `Event transaction hash: tx ${txHash},  to ${to} from ${from} amount ${amount} baseMintBurnAddress ${settings.config.baseMintBurnAddress} ${
            to.toLowerCase() !==
            settings.config.baseMintBurnAddress?.toLowerCase()
          } `,
        );

        if (
          to.toLowerCase() !==
          settings.config.baseMintBurnAddress?.toLowerCase()
        ) {
          return;
        }

        const { memo } = await decodeTransferTransaction(txHash);

        if (!memo || !memo.startsWith('swap:')) {
          this.logger.debug(
            `Ignoring Transfer event without swap memo: tx ${txHash} to ${to} from ${from} amount ${amount} memo ${memo}`,
          );
          return;
        }

        const { swapId, tonomyAccount, _testOnly_tonomyAppsWebsiteUsername } =
          parseSwapMemo(memo);

        const amountDecimal = new Decimal(amount.toString()).div(
          new Decimal(10).pow(18),
        );
        const antelopeAsset = `${amountDecimal.toFixed(6)} ${getSettings().currencySymbol}`;

        this.logger.log(
          `Swap B->T ${swapId}: Transfer detected (pending) with hash ${txHash}: from ${from} to ${to} amount ${antelopeAsset} which should be swapped to Tonomy account ${tonomyAccount}${_testOnly_tonomyAppsWebsiteUsername ? ` (Tonomy Apps username: ${_testOnly_tonomyAppsWebsiteUsername})` : ''}`,
        );

        const did = await createDidFromTonomyAppsPlatform(
          tonomyAccount,
          _testOnly_tonomyAppsWebsiteUsername,
        );

        await waitForEvmTrxFinalization(txHash);

        this.logger.debug(
          `Swap B->T ${swapId}: Base transaction finalized with hash ${txHash}`,
        );

        const trx = await getTokenContract().bridgeIssue(
          tonomyAccount,
          antelopeAsset,
          `$TONO swap to tonomy ${swapId}`,
          tonomySigner,
        );

        this.logger.debug(
          `Swap B->T ${swapId}: Issued ${antelopeAsset} to Tonomy account ${tonomyAccount} with transaction ${trx.transaction_id}`,
        );

        if (settings.env === 'production' || settings.env === 'testnet') {
          // Depends on Hyperion API which is only available on testnet and mainnet
          await waitForTonomyTrxFinalization(trx.transaction_id);
        }

        this.logger.log(
          `Swap B->T ${swapId}: Swap completed, assets minted to Tonomy account ${tonomyAccount}`,
        );

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
