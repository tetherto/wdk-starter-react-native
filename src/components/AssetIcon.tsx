import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { CHAIN_ICONS, TOKEN_ICONS } from '@/theme/assetIcons';
import { networkColor } from '@/wdk/hooks/useWalletData';

interface AssetIconProps {
  symbol: string;
  network: string;
  size?: number;
  /** Show a small chain-badge overlay in the corner — used for tokens that
   * exist on multiple chains (USDT/USDT0), matching the prototype's
   * chain-badge pattern. Native coins (BTC, ETH) don't need one, since
   * there's only ever one chain for them. */
  showChainBadge?: boolean;
}

/**
 * Shared token/chain icon — replaces the styled-text glyphs used before real
 * logo assets were available (previously "U"/"Ξ" text + a lucide Bitcoin
 * icon). Used by both the Home screen's token rows and the Receive screen's
 * selector/dropdown, which had two separate, near-identical implementations
 * of this same icon-rendering logic — consolidated into one component here.
 */
export function AssetIcon({ symbol, network, size, showChainBadge }: AssetIconProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const iconSize = size ?? moderateScale(38);

  const token = TOKEN_ICONS[symbol];
  const chain = CHAIN_ICONS[network];

  // Fallback for anything not yet in the icon map — keeps the app from
  // crashing on an unmapped asset, rendering a plain colored circle instead
  // of a logo, same visual weight as before real assets existed.
  if (!token) {
    return (
      <View
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize / 2,
          backgroundColor: networkColor[network] ?? theme.colors.textSecondary,
        }}
      />
    );
  }

  const content = token.hasBackground ? (
    <Image source={token.source} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
  ) : (
    <View
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: iconSize / 2,
        backgroundColor: networkColor[network] ?? theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={token.source}
        style={{ width: iconSize * 0.55, height: iconSize * 0.55 }}
        resizeMode="contain"
      />
    </View>
  );

  if (!showChainBadge || !chain) return <View style={{ width: iconSize, height: iconSize }}>{content}</View>;

  const badgeSize = moderateScale(17);

  return (
    <View style={{ width: iconSize, height: iconSize }}>
      {content}
      <View
        style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: chain.hasBackground ? 'transparent' : (networkColor[network] ?? theme.colors.textSecondary),
          borderWidth: chain.hasBackground ? 0 : 2,
          borderColor: theme.colors.bgPrimary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={chain.source}
          style={{
            width: chain.hasBackground ? badgeSize : badgeSize * 0.6,
            height: chain.hasBackground ? badgeSize : badgeSize * 0.6,
          }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
