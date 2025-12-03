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
} from '@tonomy/tonomy-id-sdk';
import { Decimal } from 'decimal.js';
import { tonomySigner } from '../signer';
import { CommunicationGateway } from '../communication/communication.gateway';
import { createDidFromTonomyAppsPlatform } from 'src/communication/communication.service';

@Injectable()
export class BaseTokenTransferMonitorService
    implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(BaseTokenTransferMonitorService.name);

    private removeListener?: () => void;
    constructor(private readonly communicationGateway: CommunicationGateway) { }

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
                const amountDecimal = new Decimal(amount.toString()).div(
                    new Decimal(10).pow(18),
                );
                const antelopeAsset = `${amountDecimal.toFixed(6)} ${getSettings().currencySymbol}`;

                this.logger.debug(
                    `Transfer detected (pending):  tx ${txHash} from ${from} to ${to} amount ${antelopeAsset}`,
                );

                // somewhere else you can get the transaction
                // const tx = provider.getTransaction(txHash)

                // // 0x + function selector 4bytes-8chars + 2 32bytes arguments = 138
                // const hexMemo = tx.data.substring(138, tx.data.length);

                // const memoString = ethers.toUtf8String("0x" + txMemo1);
                const swapId = memoString.substring(':')[1];
                const tonomyAccount = memoString.substring(':')[2];
                const did = await createDidFromTonomyAppsPlatform(tonomyAccount);

                await waitForEvmTrxFinalization(txHash);

                this.logger.debug(
                    `Transfer finalized: tx ${txHash} from ${from} to ${to} amount ${antelopeAsset}`,
                );

                await getTokenContract().bridgeIssue(
                    tonomyAccount,
                    antelopeAsset,
                    `$TONO swap to tonomy ${swapId}`,
                    tonomySigner,
                );

                // Send notification to wallet via WebSocket
                this.communicationGateway.sendBaseToTonomySwapTransaction(
                    did,
                    `$TONO swap to tonomy ${swapId}`,
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
    }
}
