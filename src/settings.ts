import * as configDefault from './config/config.json';
import * as configStaging from './config/config.staging.json';
import * as configDemo from './config/config.demo.json';
import { EosioUtil } from '@tonomy/tonomy-id-sdk';

const env = process.env.NODE_ENV || 'development';

if (env !== 'test') console.log(`NODE_ENV=${env}`);

type ConfigType = {
  blockchainUrl: string;
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

type SettingsType = {
  env: string;
  config: ConfigType;
  isProduction: () => boolean;
  secrets: {
    createAccountPrivateKey: string;
    hCaptchaSecret: string;
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
  case 'demo':
    config = configDemo as FixLoggerLevelEnumType<typeof configDemo>;
    break;
  case 'production':
    throw new Error('Production config not implemented yet');
  default:
    throw new Error('Unknown environment: ' + env);
}

settings.config = Object.assign({}, config);

if (process.env.BLOCKCHAIN_URL) {
  console.log(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);

  settings.config.blockchainUrl = process.env.BLOCKCHAIN_URL;
}

if (env !== 'test') console.log('settings', settings);

settings.secrets = {
  createAccountPrivateKey: EosioUtil.defaultAntelopePrivateKey.toString(),
  hCaptchaSecret: '0x0000000000000000000000000000000000000000',
};

if (process.env.CREATE_ACCOUNT_PRIVATE_KEY) {
  console.log('Using CREATE_ACCOUNT_PRIVATE_KEY from env');
  settings.secrets.createAccountPrivateKey =
    process.env.CREATE_ACCOUNT_PRIVATE_KEY;
}

if (process.env.HCAPTCHA_SECRET) {
  console.log('Using HCAPTCHA_SECRET from env');
  settings.secrets.hCaptchaSecret = process.env.HCAPTCHA_SECRET;
}

export default settings;
