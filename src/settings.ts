import * as configDefault from './config/config.json';
import * as configStaging from './config/config.staging.json';
import * as configDemo from './config/config.demo.json';

const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type ConfigType = {
  blockchainUrl: string;
};

type SettingsType = {
  env: string;
  config: ConfigType;
  isProduction: () => boolean;
  secrets: {
    createAccountPrivateKey: string;
  };
};

let config: ConfigType;
const settings: SettingsType = {
  env,
  isProduction: () => settings.env === 'production',
} as SettingsType;

switch (env) {
  case 'test':
  case 'local':
  case 'development':
    config = configDefault;
    break;
  case 'staging':
    config = configStaging;
    break;
  case 'demo':
    config = configDemo;
    break;
  case 'production':
    throw new Error('Production config not implemented yet');
  default:
    throw new Error('Unknown environment: ' + env);
}

if (process.env.BLOCKCHAIN_URL) {
  console.log(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);

  config = { blockchainUrl: process.env.BLOCKCHAIN_URL };
}

settings.config = config;

console.log('settings', settings);

if (!process.env.CREATE_ACCOUNT_PRIVATE_KEY)
  throw new Error('CREATE_ACCOUNT_PRIVATE_KEY env var not set');
settings.secrets = {
  createAccountPrivateKey: process.env.CREATE_ACCOUNT_PRIVATE_KEY,
};

export default settings;
