/**
 * Static require() map for chain/token logos (Metro needs static, analyzable
 * require() calls — no dynamic path building). Keyed by our own network/
 * symbol identifiers from src/wdk/assets.ts.
 *
 * hasBackground reflects what's actually IN each image, checked directly
 * (not assumed): Bitcoin and Tether's logos are full "coin" style with a
 * colored circle already baked in — rendering our OWN circle behind them
 * would double up. Ethereum/Arbitrum/Polygon are just the mark on a
 * transparent background, same as official brand kits typically ship them,
 * and still need a colored circle behind them for legibility/consistency.
 *
 * No dedicated USDT0 logo was provided (only a generic Tether/USDT mark) —
 * reused here, since USDT0 is still fundamentally Tether's dollar token,
 * just a different cross-chain deployment. The distinct "USDT0" name still
 * shows correctly in text throughout the app; only the icon is shared.
 */

export interface AssetIconSource {
  source: number; // return type of require() for an image asset
  hasBackground: boolean;
}

// CHAIN_ICONS moved to wdk/chains.ts, as part of unifying every genuinely
// UI-facing per-network fact (label, color, icon, explorer, indexer
// mapping) into one registry — see that file's own header comment for the
// full reasoning. Still defined with literal require() calls there,
// exactly as here — Metro needs statically analyzable paths, which moving
// them into a registry object doesn't change, since the object itself is
// still a static literal, not built dynamically.
//
// TOKEN_ICONS stays here deliberately, NOT folded into the same registry —
// it's keyed by asset SYMBOL (BTC/ETH/USDT/USDT0), not by network. Multiple
// assets can share one network (native ETH and USDT-on-Ethereum both sit
// on 'ethereum') but need different icons — a genuinely different axis
// than the per-network registry, not the same fact organized differently.

export const TOKEN_ICONS: Record<string, AssetIconSource> = {
  BTC: { source: require('@/../assets/images/tokens/bitcoin-btc-logo.png'), hasBackground: true },
  ETH: { source: require('@/../assets/images/chains/ethereum-eth-logo.png'), hasBackground: false },
  USDT: { source: require('@/../assets/images/tokens/tether-usdt-logo.png'), hasBackground: true },
  USDT0: { source: require('@/../assets/images/tokens/tether-usdt-logo.png'), hasBackground: true },
};