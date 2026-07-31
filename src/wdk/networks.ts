/**
 * Single source of truth for how each network is DISPLAYED to a person —
 * not just its internal config key.
 *
 * Bitcoin and Ethereum are configurable per-deployment (either can point at
 * mainnet OR a testnet via .env — see config.ts), so their display labels
 * are NOT hardcoded here. A hardcoded "Ethereum (Sepolia)" would silently
 * keep saying "Sepolia" even after someone repoints the provider to real
 * mainnet — exactly the gap flagged in review. Instead, the label reads
 * directly from the same .env value that determines which network is
 * actually running, so the display always matches the real configuration.
 *
 * Arbitrum and Polygon are NOT configurable this way — they're mainnet-only
 * by explicit team decision (see WDK_INTEGRATION.md), so there's no
 * mainnet/testnet ambiguity to resolve for them; their labels stay fixed.
 */

function bitcoinLabel(): string {
  const testnetLabel = process.env.EXPO_PUBLIC_BTC_NETWORK_LABEL;
  return testnetLabel ? `Bitcoin (${testnetLabel})` : 'Bitcoin';
}

function ethereumLabel(): string {
  const testnetLabel = process.env.EXPO_PUBLIC_EVM_ETHEREUM_NETWORK_LABEL;
  return testnetLabel ? `Ethereum (${testnetLabel})` : 'Ethereum';
}

export function networkDisplayName(network: string): string {
  switch (network) {
    case 'bitcoin':
      return bitcoinLabel();
    case 'ethereum':
      return ethereumLabel();
    case 'arbitrum':
      return 'Arbitrum';
    case 'polygon':
      return 'Polygon';
    default:
      return network[0]?.toUpperCase() + network.slice(1);
  }
}
