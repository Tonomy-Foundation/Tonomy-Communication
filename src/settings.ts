const env = process.env.NODE_ENV || 'development';

console.log(`NODE_ENV=${env}`);

type ConfigType = {
  blockchainUrl: string;
};

type SettingsType = {
  env: string;
  config: ConfigType;
  isProduction: () => boolean;
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
    config = require('./config/config.json');
    // TODO find a better way switch images
    break;
  case 'staging':
    config = require('./config/config.staging.json');
    break;
  case 'production':
    config = require('./config/config.json');
    // TODO add production config when ready
    break;
  default:
    throw new Error('Unknown environment: ' + env);
}

if (process.env.BLOCKCHAIN_URL) {
  console.log(`Using BLOCKCHAIN_URL from env:  ${process.env.BLOCKCHAIN_URL}`);
  config.blockchainUrl = process.env.BLOCKCHAIN_URL;
}
settings.config = config;

export default settings;
