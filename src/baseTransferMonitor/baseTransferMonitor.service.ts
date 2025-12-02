import {
    Injectable,
    Logger,
    OnApplicationShutdown,
    OnModuleInit,
} from '@nestjs/common';
import {
    getBaseTokenContract,
    waitForEvmTrxFinalization,
} from '@tonomy/tonomy-id-sdk';

@Injectable()
export class BaseTokenTransferMonitorService
    implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(BaseTokenTransferMonitorService.name);

    private removeListener?: () => void;
    private processingTx = new Set<string>();

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
                console.log('Transfer event detected:', { from, to, amount, event });
                const txHash: string = event?.transactionHash;

                if (!txHash) return;

                if (this.processingTx.has(txHash)) return;
                this.processingTx.add(txHash);

                this.logger.debug(
                    `Transfer detected (pending): from ${from} to ${to} amount ${amount?.toString?.() ?? amount}`,
                );

                await waitForEvmTrxFinalization(txHash);

                this.logger.debug(
                    `Transfer finalized: tx ${txHash} from ${from} to ${to} amount ${amount?.toString?.() ?? amount}`,
                );

                // TODO: handle finalized transfer (e.g., persist, notify, trigger workflows)
            } catch (err) {
                this.logger.error('Error processing Transfer event', err as Error);
            } finally {
                const txHash: string | undefined = event?.transactionHash;

                if (txHash) this.processingTx.delete(txHash);
            }
        };

        contract.on(event, listener);
        this.logger.log('Subscribed to Base token Transfer events');

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
