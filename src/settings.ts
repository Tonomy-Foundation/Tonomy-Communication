import configDefault from './config/config';
import configStaging from './config/config.staging';
import configTestnet from './config/config.testnet';
import configProduction from './config/config.production';
import { Logger } from '@nestjs/common';
import { ethers } from 'ethers';

const logger = new Logger('Settings');

const env = process.env.NODE_ENV || 'development';

logger.log(`NODE_ENV=${env}`);

type ConfigType = {
  blockchainUrl: string;
  accountSuffix: string;
  currencySymbol: string;
  loggerLevel:
    | 'emergency'
    | 'alert'
    | 'critical'
    | 'error'
    | 'warning'
    | 'notice'
    | 'info'
    | 'debug';
  baseNetwork: 'base' | 'base-sepolia' | 'hardhat' | 'localhost';
  baseRpcUrl: string;
  baseTokenAddress?: string;
};

type SettingsType = {
  env: string;
  config: ConfigType;
  isProduction: () => boolean;
  secrets: {
    tonomyOpsPrivateKey: string;
    hCaptchaSecret: string;
    basePrivateKey: string;
    veriffSecret: string;
  };
};

let config: ConfigType;
const settings: SettingsType = {
  env,
  isProduction: () => settings.env === 'production',
} as SettingsType;

type FixLoggerLevelEnumType<T> = Omit<T, 'loggerLevel'> & {
  loggerLevel:
    | 'emergency'
    | 'alert'
    | 'critical'
    | 'error'
    | 'warning'
    | 'notice'
    | 'info'
    | 'debug';
};

switch (env) {
  case 'test':
  case 'local':
  case 'development':
    config = configDefault as FixLoggerLevelEnumType<typeof configDefault>;
    break;
  case 'staging':
    config = configStaging as FixLoggerLevelEnumType<typeof configStaging>;
    break;
  case 'testnet':
    config = configTestnet as FixLoggerLevelEnumType<typeof configTestnet>;
    break;
  case 'production':
    config = configProduction as FixLoggerLevelEnumType<
      typeof configProduction
    >;
    break;
  default:
    throw new Error('Unknown environment: ' + env);
}

settings.config = Object.assign({}, config);

if (process.env.BLOCKCHAIN_URL) {
  logger.log(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);

  settings.config.blockchainUrl = process.env.BLOCKCHAIN_URL;
}

if (process.env.BASE_TOKEN_ADDRESS) {
  logger.log(
    `Using BASE_TOKEN_ADDRESS from env:  ${process.env.BASE_TOKEN_ADDRESS}`,
  );

  settings.config.baseTokenAddress = process.env.BASE_TOKEN_ADDRESS;
}

logger.debug('settings', settings);

settings.secrets = {
  tonomyOpsPrivateKey:
    'PVT_K1_24kG9VcMk3VkkgY4hh42X262AWV18YcPjBTd2Hox4YWoP8vRTU',
  hCaptchaSecret: '0x0000000000000000000000000000000000000000',
  basePrivateKey:
    '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', // Hardhat account #19
  veriffSecret: 'default_secret',
};

if (process.env.HCAPTCHA_SECRET) {
  logger.log('Using HCAPTCHA_SECRET from env');
  settings.secrets.hCaptchaSecret = process.env.HCAPTCHA_SECRET;
}

if (process.env.ETHEREUM_PRIVATE_KEY) {
  logger.log('Using ETHEREUM_PRIVATE_KEY from env');
  settings.secrets.basePrivateKey = process.env.ETHEREUM_PRIVATE_KEY;
}

console.log(
  `Ethereum signing address: ${new ethers.Wallet(settings.secrets.basePrivateKey).address}`,
);

if (process.env.INFURA_API_KEY) {
  logger.log('Using INFURA_API_KEY from env');
  settings.config.baseRpcUrl += process.env.INFURA_API_KEY;
}

if (process.env.TONOMY_OPS_PRIVATE_KEY) {
  logger.log('Using TONOMY_OPS_PRIVATE_KEY from env');
  settings.secrets.tonomyOpsPrivateKey = process.env.TONOMY_OPS_PRIVATE_KEY;
}

if (process.env.VERIFF_API_SECRET_KEY) {
  logger.log('Using VERIFF_API_SECRET_KEY from env');
  settings.secrets.veriffSecret = process.env.VERIFF_API_SECRET_KEY;
}

export default settings;
