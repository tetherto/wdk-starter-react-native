/**
 * Shim only — nothing to edit here.
 *
 * Assets are now declared inside each network's own entry in
 * `wdk/networks.ts`, so a network and the assets it holds are added and
 * removed together in one place. This file stays purely so existing
 * `import { ASSETS } from '@/wdk/assets'` call sites keep working.
 */
export { assetConfigs, ASSETS, ASSET_MAP } from './networks';