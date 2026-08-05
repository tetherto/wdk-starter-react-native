import type { WdkConfigs } from '@tetherto/wdk-react-native-core';
import type { BtcWalletConfig } from '@tetherto/wdk-wallet-btc';
import type { Evm7702GaslessWalletConfig } from '@tetherto/wdk-wallet-evm-7702-gasless';

/**
 * WDK network configuration — runtime config for WdkAppProvider. Must stay
 * in lockstep with wdk.config.js.
 *
 * PER MANAGER'S DIRECTION (Slack): Ethereum Sepolia is the ONLY EVM testnet
 * in scope — not a separate mainnet+testnet pair. Arbitrum and Polygon are
 * MAINNET ONLY; their testnets are explicitly out of scope.
 *
 * ⚠️ Arbitrum and Polygon below point at REAL MAINNET — genuine funds and
 * real Pimlico gas-sponsorship costs apply there. Only Ethereum (Sepolia)
 * is a safe-to-experiment-freely testnet in this configuration.
 *
 * TRON IS INTENTIONALLY OMITTED — gasfree.io is mid-migration to a new
 * testnet API version; holding off until that's resolved (see team Slack).
 *
 * delegationAddress: the package's docs give ONE example address (for
 * "SimpleAccount"), used across all three networks — an assumption based on
 * CREATE2 deployments commonly landing at the same address per chain, not
 * independently confirmed per chain.
 */

const EVM_DELEGATION_ADDRESS =
  process.env.EXPO_PUBLIC_EVM_DELEGATION_ADDRESS || '0xe6Cae83BdE06E4c305530e199D7217f42808555B';

/**
 * ⚠️ DO NOT refactor the call sites below back into `process.env[...]` with an
 * interpolated key. `babel-preset-expo` inlines a `process.env` read at bundle
 * time only when the key is a **compile-time constant**; an interpolated key
 * (`process.env[`EXPO_PUBLIC_EVM_${prefix}_PROVIDER`]`) cannot be inlined, so
 * every value silently resolved to `undefined` in release builds and Ethereum,
 * Arbitrum and Polygon all shipped with `provider: ''` — no balances, no sends.
 * It worked in development only because the dev server supplies these at
 * runtime, so the bug was invisible until an installed release build.
 *
 * Bracket vs. dot notation is irrelevant — `process.env['LITERAL_NAME']` is
 * fine. Only interpolation breaks it. Each variable is therefore read by its
 * literal name at the call site and passed in.
 *
 * Verify after any change here: `npx expo export --platform android`, then grep
 * the emitted Hermes bundle's string table for the configured URLs. See
 * docs/RELEASE.md.
 */
type EvmEnvConfig = {
  /** Env-var infix, e.g. 'ETHEREUM' — used only for the warning message. */
  network: string;
  provider: string | undefined;
  bundlerUrl: string | undefined;
  paymasterUrl: string | undefined;
};

function buildEvmConfig({
  network,
  provider,
  bundlerUrl,
  paymasterUrl,
}: EvmEnvConfig): Evm7702GaslessWalletConfig {
  if (!provider || !bundlerUrl) {
    console.warn(
      `[wdk/config] EXPO_PUBLIC_EVM_${network}_PROVIDER / EXPO_PUBLIC_EVM_${network}_BUNDLER_URL ` +
      `not set — this network's balances/sends will not work until configured in .env.`
    );
  }

  return {
    provider: provider || '',
    bundlerUrl: bundlerUrl || '',
    ...(paymasterUrl ? { paymasterUrl } : {}),
    delegationAddress: EVM_DELEGATION_ADDRESS,
    isSponsored: true,
  };
}

// ── Bitcoin ─────────────────────────────────────────────────────────────────
const bitcoinConfig: BtcWalletConfig = {
  network: 'bitcoin',
  client: {
    type: 'blockbook-http',
    clientConfig: {
      url: (process.env.EXPO_PUBLIC_BTC_PROVIDER as string) || 'https://btc1.trezor.io/api',
    },
  },
};

// ── Ethereum (Sepolia testnet — the only Ethereum-family testnet in scope) ──
const ethereumConfig = buildEvmConfig({
  network: 'ETHEREUM',
  provider: process.env.EXPO_PUBLIC_EVM_ETHEREUM_PROVIDER,
  bundlerUrl: process.env.EXPO_PUBLIC_EVM_ETHEREUM_BUNDLER_URL,
  paymasterUrl: process.env.EXPO_PUBLIC_EVM_ETHEREUM_PAYMASTER_URL,
});

// ── Arbitrum (MAINNET — real funds, real Pimlico sponsorship cost) ─────────
const arbitrumConfig = buildEvmConfig({
  network: 'ARBITRUM',
  provider: process.env.EXPO_PUBLIC_EVM_ARBITRUM_PROVIDER,
  bundlerUrl: process.env.EXPO_PUBLIC_EVM_ARBITRUM_BUNDLER_URL,
  paymasterUrl: process.env.EXPO_PUBLIC_EVM_ARBITRUM_PAYMASTER_URL,
});

// ── Polygon (MAINNET — real funds, real Pimlico sponsorship cost) ──────────
const polygonConfig = buildEvmConfig({
  network: 'POLYGON',
  provider: process.env.EXPO_PUBLIC_EVM_POLYGON_PROVIDER,
  bundlerUrl: process.env.EXPO_PUBLIC_EVM_POLYGON_BUNDLER_URL,
  paymasterUrl: process.env.EXPO_PUBLIC_EVM_POLYGON_PAYMASTER_URL,
});

export const wdkConfigs: WdkConfigs<BtcWalletConfig | Evm7702GaslessWalletConfig> = {
  networks: {
    bitcoin: { blockchain: 'bitcoin', config: bitcoinConfig },
    ethereum: { blockchain: 'ethereum', config: ethereumConfig },
    arbitrum: { blockchain: 'arbitrum', config: arbitrumConfig },
    polygon: { blockchain: 'polygon', config: polygonConfig },
  },
};

export default wdkConfigs;