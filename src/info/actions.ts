import { getSettings } from '@tonomy/tonomy-id-sdk';

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

export async function getActions(
  query?: ActionQuery,
): Promise<ActionResponse[] | undefined> {
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

export async function getAllActions(
  query?: ActionQuery,
): Promise<ActionResponse[]> {
  let allActions: ActionResponse[] = [];
  let skip = 0;
  const limit = 1000;

  // this.logger.debug('Fetching actions with query', query);

  while (true) {
    // this.logger.debug(`Fetching actions from ${skip} to ${skip + limit}...`);
    const actions = await getActions({
      ...query,
      skip,
      limit,
      noBinary: true,
    });

    if (!actions || actions.length < limit) {
      break;
    }

    allActions = allActions.concat(actions);

    if (actions.length > 0) {
      // console.log(
      //     `Fetched ${actions.length} actions from ${actions[0].timestamp} to ${actions[actions.length - 1].timestamp}`,
      // );
    }

    skip += limit;
  }

  return allActions;
}
