import React, { useState } from 'react';
import { View, Pressable, Share as RNShare } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ChevronDown, Check, Copy, Share as ShareIcon, TriangleAlert, Bitcoin } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Card } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';
import { ASSETS } from '@/wdk/assets';
import { networkColor } from '@/wdk/hooks/useWalletData';

/**
 * Receive — rebuilt to match the prototype's `receive` screen exactly (the
 * earlier version was a functional bug-fix, not a prototype-matched design):
 * a tappable selector card that expands into a full dropdown list (not
 * pills), a real QR code, an address card with BOTH copy and share buttons
 * (share was missing entirely before), and a dynamic warning box — none of
 * which existed in the previous version.
 *
 * Chain-badge overlay: the prototype uses a small corner badge on the main
 * token icon to distinguish e.g. "USDT" on different chains. We don't have
 * the prototype's actual SVG logo asset, so — consistent with every other
 * screen in this app — token icons are rendered as styled text/lucide icons
 * rather than a hotlinked/fabricated image path.
 *
 * "Gasless" labeling: the prototype's one static example only tags Tron as
 * gasless (its only gasless network in that mockup). This app's real
 * architecture is different — every EVM network here uses EIP-7702 SPONSORED
 * gas (see wdk/config.ts's isSponsored:true), so ALL of them are genuinely
 * gasless, not just one. Subtitles reflect that real distinction rather than
 * copying the prototype's one example literally.
 */

const RECEIVE_SUBTITLE: Record<string, string> = {
  'bitcoin-native': 'Bitcoin',
  'ethereum-native': 'Ethereum · gasless',
  'usdt-ethereum': 'Ethereum · ERC-20 · gasless',
  'usdt0-arbitrum': 'Arbitrum · ERC-20 · gasless',
  'usdt-polygon': 'Polygon · ERC-20 · gasless',
};

const CHAIN_BADGE_LETTER: Record<string, string> = {
  ethereum: 'E',
  arbitrum: 'A',
  polygon: 'P',
};

export default function Receive() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const [selectedId, setSelectedId] = useState(ASSETS[0].getId());
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = ASSETS.find((a) => a.getId() === selectedId) ?? ASSETS[0];
  const { address, isLoading } = useWdkAddressForNetwork(selected.getNetwork());

  const onSelect = (id: string) => {
    setSelectedId(id);
    setOpen(false);
  };

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onShare = async () => {
    if (!address) return;
    try {
      await RNShare.share({ message: address });
    } catch {
      // person cancelled the share sheet — nothing to do
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Receive" onBack={() => router.back()} />

      <Text variant="label" style={{ marginTop: 0 }}>Token and network</Text>

      {/* Selector card — tap to expand the dropdown below */}
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AssetGlyph asset={selected} />
          <View style={{ flex: 1 }}>
            <Text variant="tokenName">{selected.getSymbol()}</Text>
            <Text variant="small" color="textSecondary">{RECEIVE_SUBTITLE[selected.getId()]}</Text>
          </View>
          <ChevronDown
            size={moderateScale(18)}
            color={theme.colors.textSecondary}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Card>
      </Pressable>

      {/* Dropdown — full list, expands inline below the selector card
          (not an absolute overlay — simpler and more natural on mobile
          than replicating the prototype's positioned-menu CSS here) */}
      {open && (
        <View
          style={{
            marginTop: 6,
            backgroundColor: theme.colors.bgSecondary,
            borderRadius: theme.radii.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: 6,
          }}
        >
          {ASSETS.map((asset) => {
            const isSelected = asset.getId() === selectedId;
            return (
              <Pressable
                key={asset.getId()}
                onPress={() => onSelect(asset.getId())}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: theme.radii.md,
                  backgroundColor: isSelected ? theme.colors.brandTint : 'transparent',
                }}
              >
                <AssetGlyph asset={asset} />
                <View style={{ flex: 1 }}>
                  <Text variant="tokenName">{asset.getSymbol()}</Text>
                  <Text variant="small" color="textSecondary">{RECEIVE_SUBTITLE[asset.getId()]}</Text>
                </View>
                {isSelected && <Check size={moderateScale(18)} color={theme.colors.brand} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* QR code */}
      <View
        style={{
          width: moderateScale(220),
          height: moderateScale(220),
          backgroundColor: '#FFFFFF',
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 14,
          marginVertical: 18,
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {address ? (
          <QRCode value={address} size={moderateScale(220) - 28} />
        ) : (
          <Text variant="small" color="textSecondary">
            {isLoading ? 'Loading…' : 'No address yet'}
          </Text>
        )}
      </View>

      {/* Address card — copy + share */}
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="small" style={{ marginBottom: 3 }}>
            Your {selected.getNetwork()[0].toUpperCase() + selected.getNetwork().slice(1)} address
          </Text>
          <Text variant="mono" mono numberOfLines={1} ellipsizeMode="tail">
            {address || '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <ChipButton onPress={onCopy}>
            {copied ? <Check size={moderateScale(16)} color={theme.colors.brand} /> : <Copy size={moderateScale(16)} color={theme.colors.brand} />}
          </ChipButton>
          <ChipButton onPress={onShare}>
            <ShareIcon size={moderateScale(16)} color={theme.colors.brand} />
          </ChipButton>
        </View>
      </Card>

      {/* Warning box */}
      <View
        style={{
          backgroundColor: theme.colors.brandTint,
          borderRadius: theme.radii.md,
          padding: moderateScale(11),
          marginTop: 12,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <TriangleAlert size={moderateScale(18)} color={theme.colors.brand} style={{ marginTop: 1 }} />
        <Text variant="small" color="textSecondary" style={{ flex: 1 }}>
          Only send {selected.getSymbol()} on {selected.getNetwork()[0].toUpperCase() + selected.getNetwork().slice(1)} to this address. Sending other assets will result in loss.
        </Text>
      </View>
    </Screen>
  );
}

/** Icon for a given asset — plain icon for native coins, a "U" glyph +
 * chain-badge overlay for USDT-family tokens (matching the prototype's
 * chain-badge pattern, sans the actual logo image asset — see file header). */
function AssetGlyph({ asset }: { asset: (typeof ASSETS)[number] }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const size = moderateScale(38);
  const symbol = asset.getSymbol();
  const network = asset.getNetwork();
  const color = asset.getColor() ?? theme.colors.textSecondary;
  const isUsdtFamily = symbol.startsWith('USDT');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {symbol === 'BTC' ? (
        <Bitcoin size={moderateScale(18)} color={theme.colors.white} />
      ) : (
        <Text variant="label" color="white" style={{ fontWeight: '700' }}>
          {symbol === 'ETH' ? 'Ξ' : 'U'}
        </Text>
      )}

      {isUsdtFamily && (
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: moderateScale(17),
            height: moderateScale(17),
            borderRadius: moderateScale(17) / 2,
            backgroundColor: networkColor[network] ?? theme.colors.textSecondary,
            borderWidth: 2,
            borderColor: theme.colors.bgPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: moderateScale(9), fontWeight: '700', color: '#FFFFFF' }}>
            {CHAIN_BADGE_LETTER[network] ?? '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ChipButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: theme.colors.brandTint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}
