import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  assetToDecimal,
  EosioTokenContract,
  getStakingContract,
  getTonomyContract,
  getVestingContract,
  EosioUtil,
  getEosioMsigContract,
  getSettings,
} from '@tonomy/tonomy-id-sdk';
import Decimal from 'decimal.js';

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
  transactions24hr?: CachedValue<TransactionInfo>;
  governance?: CachedValue<GovernanceInfo>;
  token?: CachedValue<InfoStats['token']>;
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
  fn: () => Promise<TransactionInfo>,
  key: 'transactions24hr',
): Promise<TransactionInfo>;
function fromCache(
  fn: () => Promise<GovernanceInfo>,
  key: 'governance',
): Promise<GovernanceInfo>;
function fromCache(
  fn: () => Promise<InfoStats['token']>,
  key: 'token',
): Promise<InfoStats['token']>;
function fromCache(
  fn: () => Promise<NetworkInfo>,
  key: 'network',
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

  if (cached && !cached.value && cached.fetching) {
    // TODO: wait for fetch, then retur value
    throw new HttpException(
      `Fetch request is already ongoing. Try again in a few minutes.`,
      HttpStatus.CONFLICT,
    );
  }

  (cache as any)[key] = {
    value: cached?.value,
    timestamp: now,
    fetching: true,
  };

  try {
    const value = await fn();

    (cache as any)[key] = { value, timestamp: now, fetching: false };
    return value;
  } catch (error) {
    (cache as any)[key] = { timestamp: now, fetching: false };
    throw error;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTotalCoins(): string {
  return new Decimal(EosioTokenContract.TOTAL_SUPPLY).toFixed(6);
}

async function getVestedCoins(): Promise<Decimal> {
  const uniqueHolders = await getVestingContract().getAllUniqueHolders(true);
  const allAllocations = await getVestingContract().getAllAllocations(
    uniqueHolders,
    true,
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
  const circulatingCoins = new Decimal(totalCoins).minus(vestedCoins);

  return circulatingCoins.toFixed(6);
}

type NetworkInfo = {
  // ramPrice: string;
  blocks: number;
  startDate: string;
  totalAccounts: number;
};

type GovernanceInfo = {
  producers: number;
  // proposals: number;
  governanceCouncil: number;
};

type TransactionInfo = {
  total: number;
  transfers: number;
};

type InfoStats = {
  apps: {
    total: number;
  };
  people: {
    total: number;
  };
  transactions24hr: TransactionInfo;
  network: NetworkInfo;
  governance: GovernanceInfo;
  token: {
    symbol: string;
    decimals: number;
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
  const info = await EosioUtil.getChainInfo();
  const blockOne = await EosioUtil.getApi().v1.chain.get_block(1);
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

function getHost(): string {
  switch (getSettings().environment) {
    case 'production':
      return 'pangea.eosusa.io';
    case 'testnet':
      return 'test.pangea.eosusa.io';
    default:
      throw new Error(
        `environment ${getSettings().environment} not supported for fetching all vesting holders`,
      );
  }
}

// https://hyperion.docs.eosrio.io/4.0/api/v2/#v2historyget_actions
type ActionQuery = {
  account?: string;
  filter?: string;
  track?: string;
  skip?: number;
  limit?: number;
  sort?: string;
  block_num?: string;
  global_sequence?: string;
  after?: string;
  before?: string;
  simple?: boolean;
  noBinary?: boolean;
  checkLib?: boolean;
};

type ActionResponse = {
  '@timestamp': string;
  timestamp: string;
  block_num: number;
  block_id: string;
  trx_id: string;
  act: {
    account: string;
    name: string;
    authorization: { actor: string; permission: string }[];
    data: any;
  };
  receipts: Array<{
    receiver: string;
    global_sequence: number;
    recv_sequence: number;
    auth_sequence: Array<{ account: string; sequence: number }>;
  }>;
  cpu_usage_us?: number;
  net_usage_words?: number;
  account_ram_deltas?: Array<{ account: string; delta: number }>;
  global_sequence: number;
  producer: string;
  action_ordinal: number;
  creator_action_ordinal: number;
  signatures?: string[];
};

async function getActions(query?: ActionQuery): Promise<ActionResponse[]> {
  let url = `https://${getHost()}/v2/history/get_actions`;

  if (query) {
    const params = new URLSearchParams();

    for (const key of Object.keys(query)) {
      const value = (query as any)[key];

      if (value !== undefined) {
        params.append(key, value.toString());
      }
    }

    url += `?${params.toString()}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  return data.actions;
}

async function getAllActions(query?: ActionQuery): Promise<ActionResponse[]> {
  let allActions: ActionResponse[] = [];
  let skip = 0;
  const limit = 100;

  console.log('Fetching actions with query', query);

  while (true) {
    console.log(`Fetching actions from ${skip} to ${skip + limit}...`);
    const actions = await getActions({
      ...query,
      skip,
      limit,
      noBinary: true,
    });

    allActions = allActions.concat(actions);

    if (actions.length > 0) {
      console.log(
        `Fetched ${actions.length} actions from ${actions[0].timestamp} to ${actions[actions.length - 1].timestamp}`,
      );
    }

    if (actions.length < limit) {
      break;
    }

    skip += limit;
  }

  return allActions;
}

async function getTransactionInfo(): Promise<TransactionInfo> {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // const oneDayAgo = new Date('2024-01-01T00:00:00.000Z'); // (fetch ALL transactions since start of chain)
  const transactions = await getAllActions({
    after: oneDayAgo.toISOString(),
    // before: now.toISOString(),
  });
  const transfers = transactions.filter(
    (action) => action.act.name === 'transfer',
  );

  return {
    total: transactions.length,
    transfers: transfers.length,
  };
}

async function getGovernanceInfo(): Promise<GovernanceInfo> {
  const producers = (await EosioUtil.getProducers()).active.producers.length;
  // const proposals = (await getEosioMsigContract().
  const governanceAccount = await EosioUtil.getAccount('found.tmy');
  const councilLength =
    governanceAccount.getPermission('owner')?.required_auth.accounts.length;

  return {
    producers,
    // proposals: 0,
    governanceCouncil: councilLength ?? 0,
  };
}

async function getTokenInfo(): Promise<InfoStats['token']> {
  const totalCoins = getTotalCoins();

  console.log('Fetching circulating supply...');
  const circulatingSupply = await fromCache(
    getCirculatingCoins,
    'circulatingSupply',
  );

  console.log('Fetching staked coins...');
  const staked = await fromCache(getStakedCoins, 'stakedCoins');

  console.log('Fetching vested coins...');
  const vested = await fromCache(getVestedCoins, 'vestedCoins');

  return {
    symbol: 'TONO',
    decimals: 6,
    totalCoins,
    circulatingSupply,
    staked: staked.toFixed(6),
    vested: vested.toFixed(6),
  };
}

async function getInfoStats(): Promise<InfoStats> {
  console.log('Fetching info stats...');
  console.log('Fetching apps count...');
  const appsCount = await fromCache(getAppsCount, 'appsCount');

  console.log('Fetching people count...');
  const peopleCount = await fromCache(getPeopleCount, 'peopleCount');

  console.log('Fetching network info...');
  const network = await fromCache(getNetwork, 'network');

  console.log('Fetching transactions info...');
  const transactions24hr = await fromCache(
    getTransactionInfo,
    'transactions24hr',
  );

  console.log('Fetching governance info...');
  const governance = await fromCache(getGovernanceInfo, 'governance');

  console.log('Fetching token info...');
  const token = await fromCache(getTokenInfo, 'token');

  return {
    apps: {
      total: appsCount,
    },
    people: {
      total: peopleCount,
    },
    transactions24hr,
    network,
    governance,
    token,
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
    return {
      result: await fromCache(getCirculatingCoins, 'circulatingSupply'),
    };
  }

  private async getFromCoinMarketCap(query?: string): Promise<unknown> {
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
