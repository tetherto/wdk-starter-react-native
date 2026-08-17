import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import type { BtcWalletConfig } from '@tetherto/wdk-wallet-btc';
import type { Evm7702GaslessWalletConfig } from '@tetherto/wdk-wallet-evm-7702-gasless';
import { AppAsset, type AppAssetConfig } from './AppAsset';
import type { AssetIconSource } from '@/theme/assetIcons';

/**
 * ══════════════════════════════════════════════════════════════════════
 *  THE one file to edit when adding, removing, or changing a network.
 * ══════════════════════════════════════════════════════════════════════
 *
 * To add a network, you edit exactly two files:
 *
 *   1. `wdk.config.js` (repo root) — one entry naming the WDK package that
 *      implements it. That file is read by an external tool
 *      (`wdk-worklet-bundler`) at build time to compile the native worklet
 *      bundle, so it genuinely can't be merged into this one.
 *   2. THIS FILE — one entry in `NETWORKS` below.
 *
 * That's it. Everything else in the app derives from the entry you add
 * here: the runtime WDK config, the asset list, display labels, chain
 * colors and icons, block-explorer links, the indexer mapping, and every
 * screen that lists or filters by network.
 *
 * To remove a network, delete its entry here and its entry in
 * `wdk.config.js`. Nothing else needs touching.
 *
 * ── Two rules to follow when editing NETWORKS, and why they matter ────
 *
 * RULE 1: Write each `process.env.EXPO_PUBLIC_*` read out in full, as a
 * literal. Never build one by string interpolation, and never generate
 * them by looping over this array.
 *
 *   ✅  provider: process.env.EXPO_PUBLIC_EVM_POLYGON_PROVIDER
 *   ❌  provider: process.env[`EXPO_PUBLIC_EVM_${key}_PROVIDER`]
 *
 * `babel-preset-expo` replaces `process.env.EXPO_PUBLIC_*` with its actual
 * value at bundle time, but ONLY when the key is a literal it can read at
 * compile time. An interpolated key can't be inlined, so it silently
 * becomes `undefined` in a release build — while continuing to work fine
 * in development, because the dev server supplies these at runtime. This
 * is not hypothetical: it already shipped once here, and every EVM network
 * went out with `provider: ''` — no balances, no sends — before anyone
 * noticed. See `docs/RELEASE.md` for how to verify a build actually
 * inlined them.
 *
 * RULE 2: Write each `require()` for an icon out in full too, as a literal
 * path. Metro resolves image assets by statically reading that path at
 * build time; a path held in a variable can't be resolved, and the image
 * simply won't exist in the bundle.
 *
 * Both rules are the same underlying idea: these two things are read by
 * the build tooling before your code ever runs, so they have to be
 * written where the tooling can see them. Everything else in an entry is
 * ordinary data and has no such restriction.
 *
 * ── One thing that has to match `wdk.config.js` ───────────────────────
 *
 * The `network` key here must be identical to the key you use in
 * `wdk.config.js`, since that's what ties a UI network to its compiled
 * worklet module. If they disagree, the network will appear in the UI but
 * every call against it will fail.
 */

export type NetworkKind = 'bitcoin' | 'evm';

export interface NetworkAssetDefinition {
  id: string;
  isNative: boolean;
  /** Contract address for tokens; `null` for a chain's native coin. */
  address: string | null;
  symbol: string;
  name: string;
  decimals: number;
  color: string;
}

export interface NetworkDefinition {
  /** Must match this network's key in `wdk.config.js`. */
  network: string;
  kind: NetworkKind;

  // ── Runtime connection (literal env reads — see RULE 1 above) ────────
  /** Bitcoin-style networks only: the Blockbook HTTP endpoint. */
  provider?: string;
  /**
   * Bitcoin-style networks only: which chain the BTC wallet derives
   * ADDRESSES for. This is deliberately separate from `network` above and
   * is not interchangeable with it — `network` is this app's own key (and
   * must match `wdk.config.js`), whereas this is the BTC library's own
   * chain-mode setting, restricted to its three supported values. They
   * only look like the same thing because our key also happens to be
   * "bitcoin". Defaults to 'bitcoin' when omitted, matching the library's
   * own default.
   */
  btcNetwork?: BtcWalletConfig['network'];
  /** EVM networks only. */
  evm?: {
    provider: string | undefined;
    bundlerUrl: string | undefined;
    paymasterUrl: string | undefined;
  };

  // ── Display ──────────────────────────────────────────────────────────
  /** Base name shown in the UI, before any testnet suffix. */
  displayNameBase: string;
  /**
   * Optional testnet suffix, read from `.env`. When this network's
   * provider above can point at either mainnet or a testnet, read the
   * corresponding label var here — set in `.env`, the UI shows
   * "Ethereum (Sepolia)"; left blank, it shows plain "Ethereum". Leave
   * this `undefined` for networks that are mainnet-only, where there's no
   * ambiguity to communicate.
   */
  networkLabel?: string;
  color: string;
  icon: AssetIconSource;

  // ── Links and external naming ────────────────────────────────────────
  explorerName: string;
  explorerUrl: (hash: string) => string;
  /**
   * The WDK Indexer API's own name for this chain, which is NOT always the
   * same as `network` above — the indexer treats Sepolia as a distinct
   * chain from Ethereum mainnet, so our `ethereum` network maps to
   * `sepolia` there while it's pointed at the testnet. `null` means this
   * network has no transaction history available, and Activity will skip
   * it rather than show an empty list.
   */
  indexerBlockchain: string | null;

  assets: NetworkAssetDefinition[];
}

/**
 * ⚠️ Arbitrum and Polygon below point at REAL MAINNET — genuine funds and
 * real Pimlico gas-sponsorship costs apply there. Only Ethereum (Sepolia)
 * and Bitcoin (Testnet3) are safe to experiment with freely as configured.
 *
 * Tron is intentionally absent: gasfree.io is mid-migration to a new
 * testnet API version, so it's on hold rather than half-supported.
 */
export const NETWORKS: NetworkDefinition[] = [
  {
    network: 'bitcoin',
    kind: 'bitcoin',
    provider: process.env.EXPO_PUBLIC_BTC_PROVIDER,
    // Kept at 'bitcoin', exactly as before this file existed — see the
    // note on `btcNetwork` in the interface above, and the caveat in the
    // builder at the bottom of this file, before changing it.
    btcNetwork: 'bitcoin',
    displayNameBase: 'Bitcoin',
    networkLabel: process.env.EXPO_PUBLIC_BTC_NETWORK_LABEL,
    color: '#F7931A',
    icon: {
      source: require('@/../assets/images/chains/bitcoin-btc-logo.png'),
      hasBackground: true,
    },
    explorerName: 'mempool.space',
    explorerUrl: (h) => `https://mempool.space/testnet/tx/${h}`,
    indexerBlockchain: 'bitcoin',
    assets: [
      {
        id: 'bitcoin-native',
        isNative: true,
        address: null,
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
        color: '#F7931A',
      },
    ],
  },

  {
    network: 'ethereum',
    kind: 'evm',
    evm: {
      provider: process.env.EXPO_PUBLIC_EVM_ETHEREUM_PROVIDER,
      bundlerUrl: process.env.EXPO_PUBLIC_EVM_ETHEREUM_BUNDLER_URL,
      paymasterUrl: process.env.EXPO_PUBLIC_EVM_ETHEREUM_PAYMASTER_URL,
    },
    displayNameBase: 'Ethereum',
    networkLabel: process.env.EXPO_PUBLIC_EVM_ETHEREUM_NETWORK_LABEL,
    color: '#627EEA',
    icon: {
      source: require('@/../assets/images/chains/ethereum-eth-logo.png'),
      hasBackground: false,
    },
    explorerName: 'Etherscan',
    // Points at Sepolia, matching the provider above. Change both together
    // if you repoint this network at real mainnet.
    explorerUrl: (h) => `https://sepolia.etherscan.io/tx/${h}`,
    // 'sepolia', NOT 'ethereum' — the indexer treats them as separate
    // chains. Change alongside the two lines above if repointing.
    indexerBlockchain: 'sepolia',
    assets: [
      // Native ETH is deliberately absent, not an oversight: the indexer's
      // token type is exactly "usdt" | "xaut" | "btc" — there's no "eth",
      // so an ETH deposit would update the balance but never appear in
      // Activity, which reads as a broken app rather than an API limit.
      {
        id: 'usdt-ethereum',
        isNative: false,
        // Candide's Sepolia test USDT. Swap to real mainnet USDT
        // (0xdAC17F958D2ee523a2206206994597C13D831ec7) if repointing.
        address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb',
        symbol: 'USDT',
        name: 'Tether USD (Sepolia testnet)',
        decimals: 6,
        color: '#009393',
      },
    ],
  },

  {
    network: 'arbitrum',
    kind: 'evm',
    evm: {
      provider: process.env.EXPO_PUBLIC_EVM_ARBITRUM_PROVIDER,
      bundlerUrl: process.env.EXPO_PUBLIC_EVM_ARBITRUM_BUNDLER_URL,
      paymasterUrl: process.env.EXPO_PUBLIC_EVM_ARBITRUM_PAYMASTER_URL,
    },
    displayNameBase: 'Arbitrum',
    // No networkLabel — mainnet only, so there's no testnet/mainnet
    // ambiguity for the label to resolve.
    color: '#28A0F0',
    icon: {
      source: require('@/../assets/images/chains/arbitrum-arb-logo.png'),
      hasBackground: false,
    },
    explorerName: 'Arbiscan',
    explorerUrl: (h) => `https://arbiscan.io/tx/${h}`,
    indexerBlockchain: 'arbitrum',
    assets: [
      {
        id: 'usdt0-arbitrum',
        isNative: false,
        // Tether's real deployment on Arbitrum is named "USDT0" (a
        // cross-chain token standard), not "USDT" — that's the correct
        // on-chain name, not a typo. Verified on Arbiscan.
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        symbol: 'USDT0',
        name: 'Tether USD (USDT0)',
        decimals: 6,
        color: '#009393',
      },
    ],
  },

  {
    network: 'polygon',
    kind: 'evm',
    evm: {
      provider: process.env.EXPO_PUBLIC_EVM_POLYGON_PROVIDER,
      bundlerUrl: process.env.EXPO_PUBLIC_EVM_POLYGON_BUNDLER_URL,
      paymasterUrl: process.env.EXPO_PUBLIC_EVM_POLYGON_PAYMASTER_URL,
    },
    displayNameBase: 'Polygon',
    color: '#8247E5',
    icon: {
      source: require('@/../assets/images/chains/polygon-matic-logo.png'),
      hasBackground: false,
    },
    explorerName: 'Polygonscan',
    explorerUrl: (h) => `https://polygonscan.com/tx/${h}`,
    indexerBlockchain: 'polygon',
    assets: [
      {
        id: 'usdt-polygon',
        isNative: false,
        // Real mainnet USDT — verified against Tether's own docs,
        // Polygonscan, CoinGecko and CoinMarketCap.
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        color: '#009393',
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════
//  Everything below is derived from NETWORKS above. You shouldn't need to
//  edit any of it to add, remove, or change a network.
// ══════════════════════════════════════════════════════════════════════

const BY_KEY: Record<string, NetworkDefinition> = Object.fromEntries(
  NETWORKS.map((n) => [n.network, n]),
);

/** Every network key the app supports, in the order defined above. Network
 * pickers and filter lists derive from this rather than hardcoding keys. */
export const ALL_NETWORKS: string[] = NETWORKS.map((n) => n.network);

/** Kept as a record for call sites that want a whole definition. */
export const CHAINS = BY_KEY;

export function networkDisplayName(network: string): string {
  const def = BY_KEY[network];
  if (!def) return network[0]?.toUpperCase() + network.slice(1);
  return def.networkLabel ? `${def.displayNameBase} (${def.networkLabel})` : def.displayNameBase;
}

export function networkColorFor(network: string): string | undefined {
  return BY_KEY[network]?.color;
}

export function chainIconFor(network: string): AssetIconSource | undefined {
  return BY_KEY[network]?.icon;
}

export function explorerFor(
  network: string,
): { name: string; url: (hash: string) => string } | undefined {
  const def = BY_KEY[network];
  if (!def) return undefined;
  return { name: def.explorerName, url: def.explorerUrl };
}

export function indexerBlockchainFor(network: string): string | null {
  return BY_KEY[network]?.indexerBlockchain ?? null;
}

// ── Assets, flattened out of the per-network entries above ─────────────

export const assetConfigs: AppAssetConfig[] = NETWORKS.flatMap((n) =>
  n.assets.map((a) => ({
    id: a.id,
    network: n.network,
    isNative: a.isNative,
    address: a.address,
    symbol: a.symbol,
    name: a.name,
    decimals: a.decimals,
    color: a.color,
  })),
);

export const ASSETS: AppAsset[] = AppAsset.fromConfigs(assetConfigs);
export const ASSET_MAP = new Map<string, AppAsset>(ASSETS.map((a) => [a.getId(), a]));

// ── Runtime WDK config, built from the same entries ────────────────────

/**
 * The one example delegation address the WDK docs give (for
 * "SimpleAccount"), reused across all EVM networks — an assumption based
 * on CREATE2 deployments commonly landing at the same address per chain,
 * not independently confirmed per chain.
 */
const EVM_DELEGATION_ADDRESS =
  process.env.EXPO_PUBLIC_EVM_DELEGATION_ADDRESS || '0xe6Cae83BdE06E4c305530e199D7217f42808555B';

/**
 * Note this takes values that were ALREADY read literally in the entries
 * above and passes them in — it never reads `process.env` itself. That's
 * what keeps RULE 1 intact while still sharing one builder across every
 * EVM network.
 */
function buildEvmConfig(
  network: string,
  evm: NonNullable<NetworkDefinition['evm']>,
): Evm7702GaslessWalletConfig {
  if (!evm.provider || !evm.bundlerUrl) {
    console.warn(
      `[wdk/networks] "${network}" is missing its provider and/or bundler URL — ` +
        `balances and sends on this network will not work until they're set in .env.`,
    );
  }
  return {
    provider: evm.provider || '',
    bundlerUrl: evm.bundlerUrl || '',
    ...(evm.paymasterUrl ? { paymasterUrl: evm.paymasterUrl } : {}),
    delegationAddress: EVM_DELEGATION_ADDRESS,
    isSponsored: true,
  };
}

/**
 * Note the parameter type here is the BTC library's own union, NOT a plain
 * string — passing our internal network key straight through would be a
 * type error, and rightly so: they're different things that only coincide
 * today (see `btcNetwork` on NetworkDefinition above).
 *
 * ⚠️ Worth verifying if you touch Bitcoin config: `btcNetwork: 'bitcoin'`
 * means addresses are derived for MAINNET (bc1…), while the default
 * `EXPO_PUBLIC_BTC_PROVIDER` in `.env.example` points at a TESTNET
 * Blockbook instance. That combination is inherited unchanged from before
 * this file existed, so it isn't something introduced here — but it is a
 * mismatch worth confirming is intentional rather than assuming it is.
 * Testnet address derivation would be `btcNetwork: 'testnet'` (tb1…).
 */
function buildBitcoinConfig(
  btcNetwork: BtcWalletConfig['network'],
  provider: string | undefined,
): BtcWalletConfig {
  return {
    network: btcNetwork ?? 'bitcoin',
    client: {
      type: 'blockbook-http',
      clientConfig: { url: provider || 'https://btc1.trezor.io/api' },
    },
  };
}

export const wdkConfigs: WdkConfigs<BtcWalletConfig | Evm7702GaslessWalletConfig> = {
  networks: Object.fromEntries(
    NETWORKS.map((n) => [
      n.network,
      {
        blockchain: n.network,
        config:
          n.kind === 'evm'
            ? buildEvmConfig(n.network, n.evm!)
            : buildBitcoinConfig(n.btcNetwork, n.provider),
      },
    ]),
  ),
} as WdkConfigs<BtcWalletConfig | Evm7702GaslessWalletConfig>;

export default wdkConfigs;