import React from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, ExternalLink, Search } from 'lucide-react-native';
import { Screen, Text, Button } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { ASSETS } from '@/wdk/assets';
import { networkDisplayName, explorerFor } from '@/wdk/chains';

/**
 * Send — success. Matches the prototype's `send-success` screen: a
 * success-ring checkmark, "Sent", a dynamic summary line, a tappable
 * tx-hash chip, and a "View on {explorer}" link — both of the latter two
 * open the SAME real block explorer URL for the actual transaction, not a
 * static/fake link.
 *
 * Explorer mapping reflects each network's CURRENT actual config (Ethereum
 * = Sepolia testnet, Arbitrum/Polygon = real mainnet, per the team's
 * decision) — if any of these are later repointed to a different network
 * (e.g. Ethereum to real mainnet), this mapping would need updating to
 * match, same caveat as elsewhere in this app that hardcodes testnet-vs-
 * mainnet assumptions based on current .env config.
 *
 * Params read here (txHash, tokenId, amount) match exactly what
 * send/review.tsx's onConfirm actually sends — the OLD placeholder this
 * replaces read a mismatched `txId` param that review.tsx never sent.
 */
function formatCryptoAmount(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

export default function SendSuccess() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { txHash, tokenId, amount } = useLocalSearchParams<{
    txHash: string;
    tokenId: string;
    amount: string;
  }>();

  const asset = ASSETS.find((a) => a.getId() === tokenId);
  const network = asset?.getNetwork() ?? 'bitcoin';
  const explorer = explorerFor(network)!;
  const networkName = networkDisplayName(network);
  const shortHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : '';

  const done = () => {
    router.dismissTo('/(app)/(tabs)/wallet');
  };

  const openExplorer = () => {
    if (txHash) Linking.openURL(explorer.url(txHash));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: moderateScale(88),
            height: moderateScale(88),
            borderRadius: moderateScale(44),
            backgroundColor: theme.colors.successTint,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Check size={moderateScale(44)} color={theme.colors.success} />
        </View>

        <Text variant="h1">Sent</Text>
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 6 }}>
          {asset ? `${formatCryptoAmount(amount)} ${asset.getSymbol()}` : ''} was sent on {networkName}.
        </Text>

        {txHash ? (
          <Pressable
            onPress={openExplorer}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              paddingVertical: 7,
              paddingHorizontal: 14,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.brandTint,
            }}
          >
            <Text variant="mono" mono color="textPrimary">{shortHash}</Text>
            <ExternalLink size={moderateScale(14)} color={theme.colors.brand} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={openExplorer}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 26,
          }}
        >
          <Search size={moderateScale(14)} color={theme.colors.brand} />
          <Text variant="body" color="brand" style={{ fontWeight: '500' }}>View on {explorer.name}</Text>
        </Pressable>
      </View>

      <Button label="Done" onPress={done} />
    </Screen>
  );
}
