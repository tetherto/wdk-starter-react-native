import { BaseAsset } from '@tetherto/wdk-react-native-core';
import type { AssetConfig } from '@tetherto/wdk-react-native-core';

/**
 * App-level asset entity.
 *
 * WDK's BaseAsset gives the SDK everything it needs (id, network, symbol,
 * decimals, isNative, contract address). We extend it with UI-only extras the
 * wallet screens want — a brand color for the token glyph, and an optional
 * logo — exactly as the WDK showcase's AppAsset does. The SDK only ever sees
 * the IAsset interface; the extras are for our rendering.
 */
export type AppAssetConfig = AssetConfig & {
  color?: string;
};

export class AppAsset extends BaseAsset {
  protected readonly config: AppAssetConfig;
  constructor(config: AppAssetConfig) {
    super(config);
    this.config = config;
  }
  getColor(): string | undefined {
    return this.config.color;
  }
  static fromConfigs(configs: AppAssetConfig[]): AppAsset[] {
    return configs.map((c) => new AppAsset(c));
  }
}
