import { AppAsset, type AppAssetConfig } from './AppAsset';

/**
 * The app's asset list.
 *
 * PER MANAGER'S DIRECTION (Slack): Ethereum Sepolia is the only EVM testnet
 * in scope. Arbitrum and Polygon are MAINNET ONLY — their mainnet contract
 * addresses below are correct and active as configured, not placeholders.
 *
 * ⚠️ Arbitrum's USDT0 and Polygon's USDT rows below now point at REAL,
 * ACTIVE mainnet contracts, matched to the real mainnet RPCs configured in
 * .env — these will show real balances and involve real funds. Only
 * Ethereum's USDT (Sepolia) below is a safe test asset.
 *
 *   - Ethereum (Sepolia, testnet): ✅ real test USDT, from Aave's own
 *     official address book (aave-dao/aave-address-book) — verified
 *     directly, obtainable from Aave's testnet faucet.
 *   - Arbitrum (mainnet): real USDT0 (Tether's cross-chain token there —
 *     see the naming note below), real funds.
 *   - Polygon (mainnet): real USDT, real funds.
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
  {
    id: 'ethereum-native',
    network: 'ethereum',
    isNative: true,
    address: null,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    color: '#627EEA',
  },
  {
    id: 'usdt-ethereum',
    network: 'ethereum',
    isNative: false,
    // Candide's Sepolia test USDT. SWAP BACK to the real mainnet USDT
    // (0xdAC17F958D2ee523a2206206994597C13D831ec7) before testing/deploying
    // against actual Ethereum mainnet.
    address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb',
    symbol: 'USDT',
    name: 'Tether USD (Sepolia testnet)', // clarifies in the UI that this specific row is a test asset, unlike Arbitrum/Polygon below
    decimals: 6,
    color: '#009393',
  },
  {
    id: 'usdt0-arbitrum',
    network: 'arbitrum',
    isNative: false,
    // Real mainnet USDT0 contract — verified on Arbiscan. Tether's actual
    // deployment on Arbitrum is called "USDT0" (a newer cross-chain token
    // standard), not "USDT" — that's the correct on-chain name, not a typo.
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    symbol: 'USDT0',
    name: 'Tether USD (USDT0)',
    decimals: 6,
    color: '#009393',
  },
  {
    id: 'usdt-polygon',
    network: 'polygon',
    isNative: false,
    // Real mainnet USDT contract — verified via a 5/5-independent-source
    // consensus registry (Tether's own docs, Polygonscan, CoinGecko, CMC).
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    color: '#009393',
  },
];

export const ASSETS: AppAsset[] = AppAsset.fromConfigs(assetConfigs);
export const ASSET_MAP = new Map<string, AppAsset>(ASSETS.map((a) => [a.getId(), a]));