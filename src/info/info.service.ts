import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  assetToDecimal,
  EosioTokenContract,
  getStakingContract,
  getVestingContract,
} from '@tonomy/tonomy-id-sdk';
import Decimal from 'decimal.js';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// TODO: add a flag to indicate that new data is currently fetching, so just use the old cache meanwhile
// Cache of circulating supply, refreshable every hour
let cachedCirculatingSupply: { value: string; timestamp: number } | null = null;

async function getCirculatingCoinsFromCache(): Promise<string> {
  const now = Date.now();

  if (
    cachedCirculatingSupply &&
    now - cachedCirculatingSupply.timestamp < CACHE_DURATION_MS
  ) {
    return cachedCirculatingSupply.value;
  }

  const value = await getCirculatingCoins();

  cachedCirculatingSupply = { value, timestamp: now };
  return value;
}

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
      previous
        .add(assetToDecimal(allocation.tokensAllocated))
        .minus(assetToDecimal(allocation.tokensClaimed)),
    new Decimal(0),
  );
}

async function getStakedCoins(): Promise<Decimal> {
  const settings = await getStakingContract().getSettings();

  return assetToDecimal(settings.totalStaked);
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

type InfoStats = {
  apps: {
    total: number;
  };
  people: {
    total: number;
  };
  transactions: {
    total: number;
    last24h: number;
  };
  network: {
    ramPrice: string;
    blocks: number;
    startDate: string;
    totalAccounts: number;
  };
  governance: {
    producers: number;
    proposals: number;
    governanceCouncil: number;
  };
  token: {
    totalCoins: string;
    circulatingSupply: string;
    staked: string;
    vested: string;
  };
};

// cache for InfoStats
let cachedInfoStats: { value: InfoStats; timestamp: number } | null = null;

async function getInfoStatsFromCache(): Promise<InfoStats> {
  const now = Date.now();

  if (cachedInfoStats && now - cachedInfoStats.timestamp < CACHE_DURATION_MS) {
    return cachedInfoStats.value;
  }

  const value = await getInfoStats();

  cachedInfoStats = { value, timestamp: now };
  return value;
}

async function getInfoStats(): Promise<InfoStats> {
  // Stub implementation. Replace with real stats fetching logic.
  return {
    apps: {
      total: 0,
    },
    people: {
      total: 0,
    },
    transactions: {
      total: 0,
      last24h: 0,
    },
    network: {
      ramPrice: '0.0000',
      blocks: 0,
      startDate: '',
      totalAccounts: 0,
    },
    governance: {
      producers: 0,
      proposals: 0,
      governanceCouncil: 0,
    },
    token: {
      totalCoins: getTotalCoins(),
      circulatingSupply: await getCirculatingCoinsFromCache(),
      staked: (await getStakedCoins()).toFixed(6),
      vested: (await getVestedCoins()).toFixed(6),
    },
  };
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
        return await this.getStats();
    }
  }

  private async getFromCoinGecko(query?: string): Promise<unknown> {
    // Stub implementation. Replace with real CoinGecko fetch logic.
    // Intentionally not using network calls yet.
    return {
      result: getCirculatingCoinsFromCache(),
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
        return getCirculatingCoinsFromCache();
      default:
        throw new HttpException(
          'Unsupported cmc query. Allowed values: totalcoins, circulating',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private async getStats(): Promise<InfoStats> {
    return await getInfoStatsFromCache();
  }
}
