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

export interface TransferRecord {
    finalized: boolean;
    dateAdded: Date;
    amount: string;
    swapTransfer?: boolean;
    swapId: string;
    tonomyAccount: string;
    dateFinalized?: Date;
    confirmedToWallet: boolean;
    from: string;
    to: string;
}

@Injectable()
export class BaseTokenTransferMonitorService
    implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(BaseTokenTransferMonitorService.name);

    private removeListener?: () => void;
    private cleanupInterval?: NodeJS.Timeout;
    private readonly transferRecords = new Map<string, TransferRecord>();

    getTransferRecords(): ReadonlyMap<string, TransferRecord> {
        return this.transferRecords;
    }

    getTransferRecord(txHash: string): TransferRecord | undefined {
        return this.transferRecords.get(txHash);
    }

    private cleanupOldRecords() {
        const now = Date.now();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        let removedCount = 0;

        for (const [txHash, record] of this.transferRecords.entries()) {
            const age = now - record.dateAdded.getTime();

            if (age > twentyFourHoursMs) {
                this.transferRecords.delete(txHash);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.logger.debug(
                `Cleaned up ${removedCount} transfer record(s) older than 24 hours`,
            );
        }
    }

    async onModuleInit() {
        // Clean up any stale records from previous run
        this.cleanupOldRecords();

        // Schedule periodic cleanup every hour
        this.cleanupInterval = setInterval(
            () => {
                this.cleanupOldRecords();
            },
            60 * 60 * 1000,
        ); // 1 hour

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
                /*
                                                                        {
                                                                            from: '0x8DE48baf638e4Cd8Dab07Ef12375369Cb9b841dB',
                                                                            to: '0x76c6227dB16B6EE03E4f15cA64Cb1FBEbd530cEa',
                                                                            amount: 1000000000000000000n,
                                                                            event: ContractEventPayload {
                                                                                filter: [Function: Transfer] {
                                                                                name: 'Transfer',
                                                                                _contract: [Contract],
                                                                                _key: 'Transfer',
                                                                                getFragment: [Function: getFragment],
                                                                                fragment: [Getter]
                                                                                },
                                                                                emitter: Contract {
                                                                                target: '0x56aD9925f417358640746266eF44a701622c54Ba',
                                                                                interface: [Interface],
                                                                                runner: [Wallet],
                                                                                filters: {},
                                                                                fallback: null,
                                                                                [Symbol(_ethersInternal_contract)]: {}
                                                                                },
                                                                                log: EventLog {
                                                                                provider: JsonRpcProvider {},
                                                                                transactionHash: '0xbfe0162443259b0780c76cecca8762c3222e20ef8e35c82605814c3197a7c319',
                                                                                blockHash: '0x68b924d431fa368fa6a909fae028642148ec8ab3b6d4d55728153ab0f46e5153',
                                                                                blockNumber: 34458571,
                                                                                removed: false,
                                                                                address: '0x56aD9925f417358640746266eF44a701622c54Ba',
                                                                                data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
                                                                                topics: [Array],
                                                                                index: 459,
                                                                                transactionIndex: 14,
                                                                                interface: [Interface],
                                                                                fragment: [EventFragment],
                                                                                args: [Result]
                                                                                },
                                                                                args: Result(3) [
                                                                                '0x8DE48baf638e4Cd8Dab07Ef12375369Cb9b841dB',
                                                                                '0x76c6227dB16B6EE03E4f15cA64Cb1FBEbd530cEa',
                                                                                1000000000000000000n
                                                                                ],
                                                                                fragment: EventFragment {
                                                                                type: 'event',
                                                                                inputs: [Array],
                                                                                name: 'Transfer',
                                                                                anonymous: false
                                                                                }
                                                                            }
                                                                        }
                                                                        */
                const txHash: string = event.log.transactionHash;

                if (this.transferRecords.has(txHash)) return;

                // Create initial record
                const record: TransferRecord = {
                    finalized: false,
                    dateAdded: new Date(),
                    amount: amount.toString(),
                    swapTransfer: false, // TODO: populate from transaction extra data
                    swapId: '', // TODO: populate from transaction extra data
                    tonomyAccount: '', // TODO: populate from transaction extra data
                    confirmedToWallet: false,
                    from,
                    to,
                };

                this.transferRecords.set(txHash, record);

                this.logger.debug(
                    `Transfer detected (pending): from ${from} to ${to} amount ${amount.toString() ?? amount}`,
                );

                await waitForEvmTrxFinalization(txHash);

                // Update record with finalization
                record.finalized = true;
                record.dateFinalized = new Date();

                this.logger.debug(
                    `Transfer finalized: tx ${txHash} from ${from} to ${to} amount ${amount.toString() ?? amount}`,
                );
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
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    }
}
