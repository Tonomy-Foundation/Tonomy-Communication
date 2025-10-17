import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  assetToDecimal,
  EosioTokenContract,
  getStakingContract,
  getTonomyContract,
  getVestingContract,
} from '@tonomy/tonomy-id-sdk';
import Decimal from 'decimal.js';
import {
  getApi,
  getChainInfo,
} from '../../../build/sdk/types/src/sdk/services/blockchain';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day

type CachedValue<T> = {
  value?: T;
  timestamp: number;
  fetching: boolean;
};
type Cache = {
  appsCount?: CachedValue<number>;
  peopleCount?: CachedValue<number>;
  stakedCoins?: CachedValue<Decimal>;
  vestedCoins?: CachedValue<Decimal>;
  circulatingSupply?: CachedValue<string>;
  infoStats?: CachedValue<InfoStats>;
  network?: CachedValue<NetworkInfo>;
};

const cache: Cache = {};

function fromCache(
  fn: () => Promise<number>,
  key: 'peopleCount',
): Promise<number>;
function fromCache(
  fn: () => Promise<number>,
  key: 'appsCount',
): Promise<number>;
function fromCache(
  fn: () => Promise<Decimal>,
  key: 'stakedCoins' | 'vestedCoins',
): Promise<Decimal>;
function fromCache(
  fn: () => Promise<Decimal>,
  key: 'vestedCoins',
): Promise<Decimal>;
function fromCache(
  fn: () => Promise<string>,
  key: 'circulatingSupply',
): Promise<string>;
function fromCache(
  fn: () => Promise<InfoStats>,
  key: 'infoStats',
): Promise<InfoStats>;
function fromCache(
  fn: () => Promise<NetworkInfo>,
  key: keyof Cache,
): Promise<NetworkInfo>;
async function fromCache(
  fn: () => Promise<unknown>,
  key: keyof Cache,
): Promise<unknown> {
  const now = Date.now();

  const cached = cache[key] as CachedValue<unknown> | undefined;

  if (
    cached &&
    cached.value &&
    (cached.fetching || now - cached.timestamp < CACHE_DURATION_MS)
  ) {
    return cached.value;
  }

  (cache as any)[key] = {
    value: cached?.value,
    timestamp: now,
    fetching: true,
  };
  const value = await fn();

  (cache as any)[key] = { value, timestamp: now, fetching: false };
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
  const vestedCoins = await fromCache(getVestedCoins, 'vestedCoins');
  const stakedCoins = await fromCache(getStakedCoins, 'stakedCoins');
  const circulatingCoins = new Decimal(totalCoins)
    .minus(vestedCoins)
    .minus(stakedCoins);

  return circulatingCoins.toFixed(6);
}

type NetworkInfo = {
  // ramPrice: string;
  blocks: number;
  startDate: string;
  totalAccounts: number;
};

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
  network: NetworkInfo;
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

async function getAppsCount(): Promise<number> {
  const apps = await getTonomyContract().getAllApps();

  return apps.length;
}

async function getPeopleCount(): Promise<number> {
  const people = await getTonomyContract().getAllPeople();

  return people.length;
}

async function getNetwork(): Promise<NetworkInfo> {
  const info = await getChainInfo();
  const blockOne = await getApi().v1.chain.get_block(1);
  // TODO: add the number of producers
  const totalAccounts =
    (await fromCache(getPeopleCount, 'peopleCount')) +
    (await fromCache(getAppsCount, 'appsCount')) +
    14; // non app accounts from bootstrap

  return {
    blocks: info.head_block_num.toNumber(),
    startDate: blockOne.timestamp.toString(),
    totalAccounts: totalAccounts,
  };
}

async function getInfoStats(): Promise<InfoStats> {
  const appsCount = await fromCache(getAppsCount, 'appsCount');
  const peopleCount = await fromCache(getPeopleCount, 'peopleCount');
  const network = await fromCache(getNetwork, 'infoStats');

  // Stub implementation. Replace with real stats fetching logic.
  return {
    apps: {
      total: appsCount,
    },
    people: {
      total: peopleCount,
    },
    transactions: {
      total: 0,
      last24h: 0,
    },
    network,
    governance: {
      producers: 0,
      proposals: 0,
      governanceCouncil: 0,
    },
    // token: {
    //   totalCoins: getTotalCoins(),
    //   circulatingSupply: await fromCache(
    //     getCirculatingCoins,
    //     'circulatingSupply',
    //   ),
    //   staked: (await fromCache(getStakedCoins, 'stakedCoins')).toFixed(6),
    //   vested: (await fromCache(getVestedCoins, 'vestedCoins')).toFixed(6),
    // },
    token: {
      totalCoins: '',
      circulatingSupply: '',
      staked: '',
      vested: '',
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
      result: await fromCache(getCirculatingCoins, 'circulatingSupply'),
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
        return fromCache(getCirculatingCoins, 'circulatingSupply');
      default:
        throw new HttpException(
          'Unsupported cmc query. Allowed values: totalcoins, circulating',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private async getStats(): Promise<InfoStats> {
    return await fromCache(getInfoStats, 'infoStats');
  }
}
