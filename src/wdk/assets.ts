import { AppAsset, type AppAssetConfig } from './AppAsset';

/**
 * The app's asset list. WDK data hooks (useBalancesForWallet, useAccount) take
 * IAsset objects, so we define our assets once here and pass them in.
 *
 * Step 3: Bitcoin native only — matching the single network compiled into the
 * worklet (wdk.config.js) and configured in wdkConfigs. To add a chain later:
 * add its network to wdk.config.js + wdkConfigs, then add its asset(s) here.
 */
export const assetConfigs: AppAssetConfig[] = [
  {
    id: 'bitcoin-native',
    network: 'bitcoin',
    isNative: true,
    address: null,
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    color: '#F7931A',
  },
];

export const ASSETS: AppAsset[] = AppAsset.fromConfigs(assetConfigs);
export const ASSET_MAP = new Map<string, AppAsset>(ASSETS.map((a) => [a.getId(), a]));
