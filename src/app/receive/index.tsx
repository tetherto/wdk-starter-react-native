import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Copy, Check } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Card, LoadingState } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';
import { ASSETS } from '@/wdk/assets';

/**
 * Receive. Fixed a real bug: this screen previously always showed the
 * Bitcoin address (hardcoded via useWdkAccount(), which only ever derives
 * from ASSETS[0]), with no way to see Ethereum or Tron addresses at all —
 * even though the app has balances for all three. Now shows a network
 * selector (one pill per configured asset) and the correct address for
 * whichever one is selected, via useWdkAddressForNetwork(network).
 *
 * Also replaces the placeholder gray box with a real QR code
 * (react-native-qrcode-svg) and adds a working copy-to-clipboard button —
 * neither existed before.
 */
export default function Receive() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const [selectedAssetId, setSelectedAssetId] = useState(ASSETS[0].getId());

  const selectedAsset = ASSETS.find((a) => a.getId() === selectedAssetId) ?? ASSETS[0];
  const { address, isLoading } = useWdkAddressForNetwork(selectedAsset.getNetwork());
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Receive" onBack={() => router.back()} />

      {/* Network/asset selector — one pill per configured asset */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {ASSETS.map((asset) => {
          const active = asset.getId() === selectedAssetId;
          return (
            <Pressable
              key={asset.getId()}
              onPress={() => setSelectedAssetId(asset.getId())}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: theme.radii.lg,
                backgroundColor: active ? theme.colors.brandTint : theme.colors.bgSecondary,
                borderWidth: 1,
                borderColor: active ? 'transparent' : theme.colors.border,
              }}
            >
              <Text variant="body" color={active ? 'brand' : 'textSecondary'} style={{ fontWeight: '500' }}>
                {asset.getSymbol()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingState message="Loading address" />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          {address ? (
            <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: theme.radii.md }}>
              <QRCode value={address} size={moderateScale(180)} />
            </View>
          ) : (
            <View
              style={{
                width: moderateScale(180),
                height: moderateScale(180),
                backgroundColor: theme.colors.bgSecondary,
                borderRadius: theme.radii.md,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="small" color="textSecondary">No address yet</Text>
            </View>
          )}

          <Text variant="mono" center style={{ marginTop: 16, paddingHorizontal: 16 }}>
            {address || '—'}
          </Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            Your {selectedAsset.getName()} address
          </Text>

          <Pressable
            onPress={onCopy}
            disabled={!address}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}
          >
            {copied ? (
              <Check size={moderateScale(16)} color={theme.colors.brand} />
            ) : (
              <Copy size={moderateScale(16)} color={theme.colors.brand} />
            )}
            <Text variant="button" color="brand">{copied ? 'Copied' : 'Copy address'}</Text>
          </Pressable>
        </Card>
      )}
    </Screen>
  );
}
