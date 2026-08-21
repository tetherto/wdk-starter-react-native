/**
 * Shim only — nothing to edit here.
 *
 * The chain registry was merged into `wdk/networks.ts` so there's a single
 * file to edit when adding or removing a network. This file stays purely
 * so existing `import { networkDisplayName } from '@/wdk/chains'` call
 * sites keep working.
 */
export {
  CHAINS,
  ALL_NETWORKS,
  networkDisplayName,
  networkColorFor,
  chainIconFor,
  explorerFor,
  indexerBlockchainFor,
  type NetworkDefinition,
  type NetworkKind,
  type NetworkAssetDefinition,
  type NetworkId,
} from './networks';
