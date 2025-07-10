import configDefault from './config/config';
import configStaging from './config/config.staging';
import configTestnet from './config/config.testnet';
import configProduction from './config/config.production';
import Debug from 'debug';

const debug = Debug('tonomy-communication:settings');

const env = process.env.NODE_ENV || 'development';

debug(`NODE_ENV=${env}`);

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
  debug(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);

  settings.config.blockchainUrl = process.env.BLOCKCHAIN_URL;
}

debug('settings', settings);

settings.secrets = {
  createAccountPrivateKey:
    'PVT_K1_24kG9VcMk3VkkgY4hh42X262AWV18YcPjBTd2Hox4YWoP8vRTU',
  hCaptchaSecret: '0x0000000000000000000000000000000000000000',
  veriffSecret: 'default_secret',
};

if (process.env.HCAPTCHA_SECRET) {
  debug('Using HCAPTCHA_SECRET from env');
  settings.secrets.hCaptchaSecret = process.env.HCAPTCHA_SECRET;
}

if (process.env.TONOMY_OPS_PRIVATE_KEY) {
  debug('Using TONOMY_OPS_PRIVATE_KEY from env');
  settings.secrets.createAccountPrivateKey = process.env.TONOMY_OPS_PRIVATE_KEY;
}

if (process.env.VERIFF_API_SECRET_KEY) {
  debug('Using VERIFF_SECRET from env');
  settings.secrets.veriffSecret = process.env.VERIFF_API_SECRET_KEY;
}

export default settings;
