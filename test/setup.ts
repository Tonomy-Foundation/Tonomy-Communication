import { setSettings } from '@tonomy/tonomy-id-sdk';
import commSettings from '../src/settings';

// Initialize SDK settings before all e2e tests run
setSettings({
  environment: commSettings.env,
  blockchainUrl: commSettings.config.blockchainUrl,
  accountSuffix: commSettings.config.accountSuffix,
  currencySymbol: commSettings.config.currencySymbol,
  basePrivateKey: commSettings.secrets.basePrivateKey,
  baseNetwork: commSettings.config.baseNetwork,
  baseRpcUrl: commSettings.config.baseRpcUrl,
  baseTokenAddress:
    process.env.BASE_TOKEN_ADDRESS || commSettings.config.baseTokenAddress,
});
