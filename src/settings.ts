import * as configDefault from './config/config.json';
import * as configStaging from './config/config.staging.json';
import * as configDemo from './config/config.demo.json';

const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

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

if (process.env.BLOCKCHAIN_URL) {
  console.log(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);

  config.blockchainUrl = process.env.BLOCKCHAIN_URL;
}

settings.config = config;

console.log('settings', settings);

settings.secrets = {
  createAccountPrivateKey:
    process.env.CREATE_ACCOUNT_PRIVATE_KEY ||
    'PVT_K1_2bfGi9rYsXQSXXTvJbDAPhHLQUojjaNLomdm3cEJ1XTzMqUt3V', // Default antelope private key
  hCaptchaSecret:
    process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000', // hCaptcha CI secret
};

export default settings;
