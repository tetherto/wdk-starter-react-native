/**
 * Shim only — nothing to edit here.
 *
 * Network configuration now lives in `wdk/networks.ts`, together with
 * every other per-network fact (assets, labels, colors, icons, explorers,
 * indexer mapping). This file stays purely so existing
 * `import { wdkConfigs } from '@/wdk/config'` call sites keep working.
 */
export { wdkConfigs, default } from './networks';