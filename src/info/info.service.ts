import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  assetToDecimal,
  EosioTokenContract,
  getStakingContract,
  getVestingContract,
} from '@tonomy/tonomy-id-sdk';
import Decimal from 'decimal.js';

function getTotalCoins(): string {
  return new Decimal(EosioTokenContract.TOTAL_SUPPLY).toFixed(6);
}

async function getVestedCoins(): Promise<Decimal> {
  const uniqueHolders = await getVestingContract().getAllUniqueHolders();
  const allAllocations = await getVestingContract().getAllAllocations(
    uniqueHolders,
    false,
  );

  return allAllocations.reduce<Decimal>(
    (previous, allocation) =>
    (previous += assetToDecimal(allocation.tokensAllocated)
      .minus(assetToDecimal(allocation.tokensWithdrawn))
      .toNumber()),
    new Decimal(0),
  );
}

async function getStakedCoins(): Promise<Decimal> {
  const settings = await getStakingContract().getSettings();

  return new Decimal(settings.totalStaked);
}

async function getCirculatingCoins(): Promise<string> {
  const totalCoins = getTotalCoins();
  const vestedCoins = await getVestedCoins();
  const stakedCoins = await getStakedCoins();
  const circulatingCoins = new Decimal(totalCoins)
    .minus(vestedCoins)
    .minus(stakedCoins);

  return circulatingCoins.toFixed(6);
}

@Injectable()
export class InfoService {
  private readonly logger = new Logger(InfoService.name);

  async getInfo(source: string, query?: string): Promise<unknown> {
    this.logger.debug(`getInfo() source=${source} query=${query ?? ''}`);

    switch (source ? source.toLowerCase() : '') {
      case 'cgk':
        return await this.getFromCoinGecko(query);
      case 'cmc':
        return await this.getFromCoinMarketCap(query);
      default:
        return await this.getFromCoinGecko(query);
    }
  }

  private async getFromCoinGecko(query?: string): Promise<unknown> {
    // Stub implementation. Replace with real CoinGecko fetch logic.
    // Intentionally not using network calls yet.
    return {
      result: getCirculatingCoins(),
    };
  }

  private async getFromCoinMarketCap(query?: string): Promise<unknown> {
    // Stub implementation. Replace with real CoinMarketCap fetch logic.
    if (!query) {
      throw new HttpException(
        'Query parameter "q" is required for source cmc',
        HttpStatus.BAD_REQUEST,
      );
    }

    switch (query ? query.toLowerCase() : '') {
      case 'totalcoins':
        return getTotalCoins();
      case 'circulating':
        return getCirculatingCoins();
      default:
        throw new HttpException(
          'Unsupported cmc query. Allowed values: totalcoins, circulating',
          HttpStatus.BAD_REQUEST,
        );
    }
  }
}
