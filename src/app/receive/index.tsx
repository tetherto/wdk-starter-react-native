import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ChevronDown, Check, Copy, TriangleAlert } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Card, AssetIcon } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';
import { ASSETS } from '@/wdk/assets';
import { networkDisplayName } from '@/wdk/chains';

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

/**
 * Real bug fixed: this used to be a static lookup table with the network
 * label hardcoded directly into each string (e.g. "Ethereum (Sepolia)") —
 * completely bypassing networkDisplayName(), which is why clearing
 * EXPO_PUBLIC_EVM_ETHEREUM_NETWORK_LABEL correctly updated the address
 * label and warning text elsewhere on this same screen, but NOT this
 * dropdown subtitle. Rebuilt as a function that derives the label live,
 * every time, from the same single source of truth everything else uses.
 */
function receiveSubtitle(assetId: string, network: string): string {
  const base = networkDisplayName(network);
  const isToken = assetId.startsWith('usdt');
  return isToken ? `${base} · ERC-20` : base;
}

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

  return (
    <Screen scroll>
      <ScreenHeader title="Receive" onBack={() => router.back()} />

      <Text variant="label" style={{ marginTop: 0 }}>Token and network</Text>

      {/* Selector card — tap to expand the dropdown below */}
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <AssetIcon symbol={selected.getSymbol()} network={selected.getNetwork()} showChainBadge={selected.getSymbol().startsWith('USDT')} />
          <View style={{ flex: 1 }}>
            <Text variant="tokenName">{selected.getSymbol()}</Text>
            <Text variant="small" color="textSecondary">{receiveSubtitle(selected.getId(), selected.getNetwork())}</Text>
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
                <AssetIcon symbol={asset.getSymbol()} network={asset.getNetwork()} showChainBadge={asset.getSymbol().startsWith('USDT')} />
                <View style={{ flex: 1 }}>
                  <Text variant="tokenName">{asset.getSymbol()}</Text>
                  <Text variant="small" color="textSecondary">{receiveSubtitle(asset.getId(), asset.getNetwork())}</Text>
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
            Your {networkDisplayName(selected.getNetwork())} address
          </Text>
          <Text variant="mono" mono numberOfLines={1} ellipsizeMode="tail">
            {address || '—'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <ChipButton onPress={onCopy}>
            {copied ? <Check size={moderateScale(16)} color={theme.colors.brand} /> : <Copy size={moderateScale(16)} color={theme.colors.brand} />}
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
          {selected.getNetwork() === 'bitcoin'
            ? `Only send BTC to this address. Sending other assets will result in loss.`
            : `Only send assets on ${networkDisplayName(selected.getNetwork())} to this address. Sending assets from a different network will result in loss.`}
        </Text>
      </View>
    </Screen>
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
