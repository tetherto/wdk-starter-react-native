import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import type { BtcWalletConfig } from '@tetherto/wdk-wallet-btc';

/**
 * WDK network configuration.
 *
 * Step 2: a single Bitcoin network, matching `wdk.config.js` (which controls
 * what's compiled into the worklet). Additional networks are added in Step 6,
 * in lockstep with `wdk.config.js`.
 *
 * The provider URL comes from an env var so it's not hard-coded; set
 * EXPO_PUBLIC_BTC_PROVIDER in a .env file. A public Blockbook default is used
 * if unset so the app runs out of the box during development.
 */
export const wdkConfigs: WdkConfigs<BtcWalletConfig> = {
  networks: {
    bitcoin: {
      blockchain: 'bitcoin',
      config: {
        network: 'bitcoin',
        client: {
          type: 'blockbook-http',
          clientConfig: {
            url:
              (process.env.EXPO_PUBLIC_BTC_PROVIDER as string) ||
              'https://btc1.trezor.io',
          },
        },
      },
    },
  },
};

export default wdkConfigs;
