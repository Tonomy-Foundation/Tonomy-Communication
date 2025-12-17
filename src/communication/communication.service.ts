import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from './dto/client.dto';
import { MessageDto } from './dto/message.dto';
import { WebsocketReturnType } from './communication.gateway';
import { Server } from 'socket.io';
import {
  VerificationMessage,
  SwapTokenMessage,
  verifySignature,
  getAccountNameFromDid,
  getBaseTokenContract,
  parseDid,
  getTonomyContract,
  TonomyUsername,
  AccountType,
  getSettings,
  getTokenContract,
  randomString,
  waitForEvmTrxFinalization,
  waitForTonomyTrxFinalization,
  sendSafeWalletTransfer,
  createAntelopeDid,
  FaucetTokenMessage,
  assetToDecimal,
} from '@tonomy/tonomy-id-sdk';
import { tonomySigner } from '../signer';
import { ethers } from 'ethers';
import settings from '../settings';
import { Decimal } from 'decimal.js';
import Debug from 'debug';

const debug = Debug('tonomy-communication:communication.service');

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  private readonly loggedInUsers = new Map<string, Socket['id']>();
  private readonly userSockets = new Map<string, Client>();
  private readonly faucetRequestTracker = new Map<
    string,
    { amount: Decimal; timestamp: number }[]
  >();
  private readonly FAUCET_LIMIT_24H = new Decimal('20000');
  private readonly THROTTLE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private server!: Server;

  setServer(server: Server) {
    this.server = server;
  }
  /**
   * delete the disconnecting user from the users map
   * @param socket user socket
   */
  safeDisconnect(socket: Client) {
    if (socket.did) {
      this.loggedInUsers.delete(socket.did);
      this.userSockets.delete(socket.did);
      this.logger.debug(`User ${socket.did} disconnected`);
    }
  }

  /**
   * Get the socket ID of a logged-in user by their DID
   * @param did the user DID
   * @returns socket ID if user is logged in, undefined otherwise
   */
  getLoggedInUser(did: string): string {
    const socketId = this.loggedInUsers.get(did);

    if (socketId === undefined) {
      throw new Error(`User with DID ${did} not found`);
    }

    return socketId;
  }

  /**
   * add user to the loggedIn Map and add user's did to his socket for easier use
   * @param did the user did
   * @param socket user socket
   * @returns boolean if user is connected successfully
   */
  login(did: string, socket: Client): boolean {
    this.logger.debug(`login() ${did} ${socket.id}`);

    if (this.loggedInUsers.get(did) === socket.id) return false;
    this.loggedInUsers.set(did, socket.id);
    this.userSockets.set(did, socket);
    socket.did = did;

    return true;
  }

  /**
   * send the message to the right user if user is connected
   * @param socket user socket
   * @param message signed VC
   * @throws if the receiving user isn't online or loggedIn
   * @returns boolean if message is sent to the user
   */
  sendMessage(socket: Client, message: MessageDto): boolean {
    const recipient = this.loggedInUsers.get(message.getRecipient());

    this.logger.debug(
      `sendMessage() ${message.getIssuer()} ${message.getRecipient()} ${message.getType()} ${recipient}`,
    );

    if (!recipient) {
      // TODO: send via PushNotification and/or use message queue
      throw new HttpException(
        `Recipient not connected ${message.getRecipient()}`,
        HttpStatus.BAD_REQUEST,
      );
    } else {
      // TODO: should check for acknowledgement
      socket.to(recipient).emit('v1/message/relay/receive', message.toString());
    }

    return true;
  }

  /**
   * Swaps the $TONO token from Base-chain to Tonomy blockchain
   * @param {Client} socket user socket
   * @param {SwapTokenMessage} message signed VC
   * @throws if the receiving user isn't online or loggedIn
   * @returns boolean if message is sent to the user
   */
  async swapTokenTonomyToBase(
    socket: Client,
    message: SwapTokenMessage,
  ): Promise<boolean> {
    const loggerId = randomString(6);
    const payload = message.getPayload();
    const issuer = message.getIssuer();

    this.logger.debug(
      `[Swap T->B: ${loggerId}]: swapToken() from ${issuer} to Base address ${payload.baseAddress}`,
    );

    await checkIssuerFromTonomyPlatform(
      issuer,
      payload._testOnly_tonomyAppsWebsiteUsername,
    );

    const baseAddress = payload.baseAddress;
    const tonomyAccount = getAccountNameFromDid(issuer);
    const amount = new Decimal(payload.amount);
    const { result, reason } = verifySignature(
      payload.proof.message,
      payload.proof.signature,
      baseAddress,
    );

    if (!result) {
      throw new HttpException(
        `Invalid proof of base address: ${reason}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (amount.lessThanOrEqualTo(0)) {
      throw new HttpException(
        `Invalid amount ${amount.toString()}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const antelopeAsset = `${amount.toFixed(6)} ${getSettings().currencySymbol}`;
    const ethAmount = ethers.parseEther(amount.toFixed(6));

    this.logger.log(
      `[Swap T->B: ${loggerId}]: Swapping ${antelopeAsset} from Tonomy account ${tonomyAccount} to Base address ${baseAddress}`,
    );
    const trx = await getTokenContract().bridgeRetire(
      tonomyAccount,
      antelopeAsset,
      `$TONO swap to base ${loggerId}`,
      tonomySigner,
    );

    this.logger.debug(
      `[Swap T->B: ${loggerId}]: Retired ${antelopeAsset} from Tonomy account ${tonomyAccount} with transaction ${trx.transaction_id}`,
    );

    if (settings.env === 'production' || settings.env === 'testnet') {
      // Depends on Hyperion API which is only available on testnet and mainnet
      await waitForTonomyTrxFinalization(trx.transaction_id);
      this.logger.debug(
        `[Swap T->B: ${loggerId}]: Tonomy transaction ${trx.transaction_id} finalized`,
      );
    }

    if (settings.env === 'production') {
      // Need to do a more complicated DAO transaction...
      const safeClientResult = await sendSafeWalletTransfer(
        baseAddress,
        ethAmount,
      );
      const trxHash = safeClientResult.transactions?.ethereumTxHash;

      if (!trxHash) {
        throw new HttpException(
          `Safe wallet transfer failed for Base address ${baseAddress}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      await waitForEvmTrxFinalization(trxHash);

      this.logger.debug(
        `[Swap T->B: ${loggerId}]: Safe wallet transfer to Base address ${baseAddress} submitted with transaction hash ${trxHash}`,
      );
    } else {
      const mintTrx = await getBaseTokenContract().transfer(
        baseAddress,
        ethAmount,
      );

      await waitForEvmTrxFinalization(mintTrx.hash);

      this.logger.debug(
        `[Swap T->B: ${loggerId}]: Mint transaction submitted to Base with transaction hash ${mintTrx.hash}`,
      );
    }

    this.logger.log(`[Swap T->B: ${loggerId}]: Swap completed successfully`);
    return true;
  }

  /**
   * Requests testnet tokens from the faucet service
   * @param {Client} socket user socket
   * @param {SwapTokenMessage} message signed VC containing faucet request
   * @returns boolean if tokens were transferred successfully
   */
  async requestFaucetToken(
    socket: Client,
    message: FaucetTokenMessage,
  ): Promise<boolean> {
    const loggerId = randomString(6);
    const payload = message.getPayload();
    const issuer = message.getIssuer();

    this.logger.debug(
      `[Faucet: ${loggerId}]: requestFaucetToken() from ${issuer}`,
    );

    if (settings.env === 'production') {
      throw new HttpException(
        `Faucet service is not available in production`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await checkIssuerFromTonomyPlatform(
      issuer,
      payload._testOnly_tonomyAppsWebsiteUsername,
    );

    const tonomyAccount = getAccountNameFromDid(issuer);
    const asset = payload.asset;

    if (!asset || asset.trim().length === 0 || !asset.endsWith(' TONO')) {
      throw new HttpException(
        `Invalid asset format ${asset}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const assetAmount = assetToDecimal(asset);

    if (assetAmount.lessThanOrEqualTo(0)) {
      throw new HttpException(
        `Invalid asset amount ${asset}`,
        HttpStatus.BAD_REQUEST,
      );
    } else if (assetAmount.greaterThan(1000)) {
      throw new HttpException(
        `Requested asset amount exceeds faucet limit: ${asset}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check 24-hour throttling
    this.checkFaucetThrottle(issuer, assetAmount, loggerId);

    this.logger.log(
      `[Faucet: ${loggerId}]: Transferring ${asset} to Tonomy account ${tonomyAccount}`,
    );

    const trx = await getTokenContract().transfer(
      'ops.tmy',
      tonomyAccount,
      asset,
      `Faucet token request ${loggerId}`,
      tonomySigner,
    );

    this.logger.debug(
      `[Faucet: ${loggerId}]: Faucet transaction submitted with ID ${trx.transaction_id}`,
    );

    if (settings.env === 'production' || settings.env === 'testnet') {
      // Depends on Hyperion API which is only available on testnet and mainnet
      await waitForTonomyTrxFinalization(trx.transaction_id);
      this.logger.debug(
        `[Faucet: ${loggerId}]: Tonomy transaction ${trx.transaction_id} finalized`,
      );
    }

    // Track this request for throttling purposes
    this.trackFaucetRequest(issuer, assetAmount);

    this.logger.log(
      `[Faucet: ${loggerId}]: Faucet transfer completed successfully`,
    );
    return true;
  }

  /**
   * Check if account has exceeded 24-hour faucet limit
   * @param issuer the DID of the requester
   * @param requestAmount the amount being requested
   * @param loggerId logging identifier
   * @throws HttpException if throttle limit exceeded
   */
  private checkFaucetThrottle(
    issuer: string,
    requestAmount: Decimal,
    loggerId: string,
  ): void {
    const now = Date.now();
    const requests = this.faucetRequestTracker.get(issuer) || [];

    // Remove requests older than 24 hours
    const recentRequests = requests.filter(
      (req) => now - req.timestamp < this.THROTTLE_WINDOW_MS,
    );

    // Calculate total requested in last 24 hours
    const totalRequested = recentRequests.reduce(
      (sum, req) => sum.plus(req.amount),
      new Decimal(0),
    );

    const newTotal = totalRequested.plus(requestAmount);

    if (newTotal.greaterThan(this.FAUCET_LIMIT_24H)) {
      const remainingAllowance = this.FAUCET_LIMIT_24H.minus(totalRequested);

      this.logger.warn(
        `[Faucet: ${loggerId}]: Account ${issuer} exceeded 24-hour limit. Requested: ${requestAmount.toString()}, Remaining allowance: ${remainingAllowance.toString()}`,
      );
      throw new HttpException(
        `Daily faucet limit exceeded. You have requested ${totalRequested.toString()} TONO in the last 24 hours. Maximum allowed: ${this.FAUCET_LIMIT_24H.toString()} TONO. Remaining allowance: ${remainingAllowance.toString()} TONO`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Track a faucet request for throttling purposes
   * @param issuer the DID of the requester
   * @param amount the amount requested
   */
  private trackFaucetRequest(issuer: string, amount: Decimal): void {
    const requests = this.faucetRequestTracker.get(issuer) || [];

    requests.push({
      amount,
      timestamp: Date.now(),
    });
    this.faucetRequestTracker.set(issuer, requests);
  }

  /**
   * Send a 'veriff' event to a specific user by DID
   * @param did recipient DID
   * @param payload data to send
   * @throws if user is not connected
   */
  sendVeriffToDid(did: string, payload: VerificationMessage): boolean {
    const socket = this.userSockets.get(did);

    if (!socket) {
      this.logger.warn(`Veriff: User with DID ${did} is not connected`);
      throw new HttpException(
        `User with DID ${did} is not connected`,
        HttpStatus.BAD_REQUEST,
      );
    }

    socket.emit('v1/verification/veriff/receive', payload);
    this.logger.debug(
      `Sent 'veriff' to DID ${did}: ${JSON.stringify(payload)}`,
    );
    return true;
  }

  emitBaseToTonomySwapConfirmation(did: string, memo: string): boolean {
    this.logger.debug(`emitBaseToTonomySwapConfirmation() ${did} ${memo}`);
    const socket = this.userSockets.get(did);

    if (!socket) {
      this.logger.warn(`Swap: Tokens from base to tonomy is not connected`);
      throw new HttpException(
        `User with DID ${did} is not connected`,
        HttpStatus.BAD_REQUEST,
      );
    }

    socket.emit('v1/swap/token/confirm', memo);
    this.logger.debug(`Sent ${did} 'token' from base to tonomy ${memo}}`);
    return true;
  }

  handleError(e): WebsocketReturnType {
    this.logger.debug('handleError()', e);

    if (e instanceof HttpException) {
      throw e;
    }

    throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

let tonomyAppsAccountName: string | undefined;

async function getAccountNameForTonomyAppsPlatform(
  _testOnly_tonomyAppsWebsiteUsername?: string,
): Promise<string> {
  let tonomyAppsWebsiteUsername = 'tonomy-apps';

  if (settings.env === 'development' || settings.env === 'test') {
    if (_testOnly_tonomyAppsWebsiteUsername) {
      tonomyAppsWebsiteUsername = _testOnly_tonomyAppsWebsiteUsername;
    }
  } else {
    if (_testOnly_tonomyAppsWebsiteUsername) {
      throw new Error(
        'tonomyAppsWebsiteUsername can only be used in testing/development environments',
      );
    }

    if (tonomyAppsAccountName) {
      return tonomyAppsAccountName;
    }
  }

  const app = await getTonomyContract().getApp(
    TonomyUsername.fromUsername(
      tonomyAppsWebsiteUsername,
      AccountType.APP,
      getSettings().accountSuffix,
    ),
  );

  if (!_testOnly_tonomyAppsWebsiteUsername)
    tonomyAppsAccountName = app.accountName.toString();
  return app.accountName.toString();
}

async function checkIssuerFromTonomyPlatform(
  issuer: string,
  tonomyAppsWebsiteUsername?: string,
) {
  const { fragment } = parseDid(issuer);

  const accountName = await getAccountNameForTonomyAppsPlatform(
    tonomyAppsWebsiteUsername,
  );

  if (fragment !== accountName.toString()) {
    throw new HttpException(
      `Invalid DID fragment ${fragment}, did not match the account name from the Tonomy apps platform`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export async function createDidFromTonomyAppsPlatform(
  accountName: string,
  _testOnly_tonomyAppsWebsiteUsername?: string,
): Promise<string> {
  const appName = await getAccountNameForTonomyAppsPlatform(
    _testOnly_tonomyAppsWebsiteUsername,
  );

  return await createAntelopeDid(accountName, appName);
}
