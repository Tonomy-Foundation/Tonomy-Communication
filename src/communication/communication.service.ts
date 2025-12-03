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
} from '@tonomy/tonomy-id-sdk';
import { tonomySigner } from '../signer';
import { ethers } from 'ethers';
import settings from '../settings';
import { Decimal } from 'decimal.js';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  private readonly loggedInUsers = new Map<string, Socket['id']>();
  private readonly userSockets = new Map<string, Client>();

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
    this.logger.debug('login()', did, socket.id);

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
      'sendMessage()',
      message.getIssuer(),
      message.getRecipient(),
      message.getType(),
      recipient,
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
  async swapToken(socket: Client, message: SwapTokenMessage): Promise<boolean> {
    const loggerId = randomString(6);
    const payload = message.getPayload();
    const issuer = message.getIssuer();

    this.logger.debug(`[Swap: ${loggerId}]: swapToken()`, issuer, payload);

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

    if (payload.destination === 'base') {
      throw new HttpException(
        `Invalid base destination`,
        HttpStatus.BAD_REQUEST,
      );
    } else if (payload.destination === 'tonomy') {
      this.logger.log(
        `[Swap: ${loggerId}]: Swapping ${antelopeAsset} from Base address ${baseAddress} to Tonomy account ${tonomyAccount}`,
      );
      const trx = await getBaseTokenContract().bridgeBurn(
        baseAddress,
        ethAmount,
      );

      this.logger.debug(
        `[Swap: ${loggerId}]: Burned ${antelopeAsset} from Base address ${baseAddress} with transaction ${trx.hash}`,
      );
      await waitForEvmTrxFinalization(trx.hash);
      this.logger.debug(
        `[Swap: ${loggerId}]: Base transaction ${trx.hash} finalized`,
      );
      await getTokenContract().bridgeIssue(
        tonomyAccount,
        antelopeAsset,
        `$TONO swap to tonomy ${loggerId}`,
        tonomySigner,
      );
      this.logger.debug(
        `[Swap: ${loggerId}]: Issued ${antelopeAsset} to Tonomy account ${tonomyAccount}`,
      );
    } else {
      throw new HttpException(
        `Invalid destination ${payload.destination}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`[Swap: ${loggerId}]: Swap completed successfully`);

    return true;
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

  swapBaseToTonomy(did: string, memo: string): boolean {
    const socket = this.userSockets.get(did);

    if (!socket) {
      this.logger.warn(`Swap: Tokens from base to tonomy is not connected`);
      throw new HttpException(
        `User with DID ${did} is not connected`,
        HttpStatus.BAD_REQUEST,
      );
    }

    socket.emit('v1/swap/token/confirm', memo);
    this.logger.debug(`Sent 'token' from base to tonomy ${memo}}`);
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
  tonomyAppsWebsiteUsername?: string,
): Promise<string> {
  if (!tonomyAppsWebsiteUsername) {
    tonomyAppsWebsiteUsername = 'tonomy-apps';
    if (tonomyAppsAccountName) return tonomyAppsAccountName;
  } else {
    if (settings.isProduction())
      throw new Error(
        'tonomyAppsWebsiteUsername can only be used in non-production environments',
      );
  }

  const app = await getTonomyContract().getApp(
    TonomyUsername.fromUsername(
      tonomyAppsWebsiteUsername,
      AccountType.APP,
      getSettings().accountSuffix,
    ),
  );

  if (!tonomyAppsWebsiteUsername)
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

export async function createDidFromTonomyAppsPlatform(accountName: string) {
  const fragment = await getAccountNameForTonomyAppsPlatform();

  return `did:tonomy:${accountName}#${fragment}`;
}
