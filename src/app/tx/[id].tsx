import React from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, ArrowUpRight, Bookmark, ExternalLink } from 'lucide-react-native';
import { Screen, Card, Text, LoadingState, AssetIcon } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkTransactions, useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';

/**
 * Transaction detail — matches the prototype's dedicated `tx-detail` screen.
 *
 * "Nonce" label: kept exactly as the prototype names it, per direct
 * feedback — but the underlying number shown is actually this
 * transaction's BLOCK NUMBER, not a true account nonce. The indexer's own
 * data has no nonce field at all (checked directly), so there's nothing
 * to show a real nonce with. Labeling it "Nonce" anyway trades a small
 * technical inaccuracy for visual fidelity to the design, by explicit
 * request — flagged here so it's a known, deliberate choice, not an
 * unnoticed mislabel.
 *
 * "Estimated gas fee" / ETH-equivalent line: for EVM assets, this app's
 * gas is genuinely, verifiably free (isSponsored: true, confirmed 0 fee
 * directly in the SDK's own source) — so "0 ETH" shown here is a real,
 * honest number, not a placeholder. Bitcoin has no ETH-gas concept at all,
 * so that line is simply omitted for Bitcoin transactions rather than
 * showing a nonsensical "/ 0 ETH".
 */

function formatTxDate(timestamp: number): string {
  const d = new Date(timestamp);
  const month = d.toLocaleString(undefined, { month: 'short' });
  const day = d.getDate();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${month} ${day} at ${hours}:${minutes} ${ampm}`;
}

const EXPLORER: Record<string, { name: string; url: (hash: string) => string }> = {
  bitcoin: { name: 'mempool.space', url: (h) => `https://mempool.space/testnet/tx/${h}` },
  ethereum: { name: 'Etherscan', url: (h) => `https://sepolia.etherscan.io/tx/${h}` },
  arbitrum: { name: 'Arbiscan', url: (h) => `https://arbiscan.io/tx/${h}` },
  polygon: { name: 'Polygonscan', url: (h) => `https://polygonscan.com/tx/${h}` },
};

export default function TxDetail() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useWdkTransactions();

  const tx = data.find((t) => t.id === id);
  const myAddress = useWdkAddressForNetwork(tx?.token.chain ?? 'bitcoin');

  if (isLoading) {
    return (
      <Screen>
        <LoadingState message="Loading transaction" />
      </Screen>
    );
  }

  if (!tx) {
    return (
      <Screen>
        <Text variant="body" color="textSecondary">Transaction not found.</Text>
      </Screen>
    );
  }

  const isOut = tx.direction === 'out';
  const isSponsoredNetwork = tx.token.chain !== 'bitcoin';
  const dateText = formatTxDate(tx.timestamp);
  const explorer = EXPLORER[tx.token.chain];

  const shortAddr = (addr: string) => (addr && addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-5)}` : addr || '—');
  const fromAddress = isOut ? myAddress.address : tx.address;
  const toAddress = isOut ? tx.address : myAddress.address;

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      {/* Header — spacer / title+date / close ("X", not a back-chevron —
          matches the prototype's own markup exactly) */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ width: moderateScale(36) }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="h2" style={{ margin: 0 }}>
            {isOut ? 'Sent' : 'Received'} {tx.token.symbol}
          </Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>{dateText}</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: moderateScale(36),
            height: moderateScale(36),
            borderRadius: moderateScale(18),
            backgroundColor: theme.colors.bgSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={moderateScale(18)} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <AssetIcon
          symbol={tx.token.symbol}
          network={tx.token.chain}
          size={moderateScale(48)}
          showChainBadge={tx.token.symbol.startsWith('USDT')}
        />
      </View>

      {/* Status / Date row */}
      <View
        style={{
          flexDirection: 'row',
          gap: 20,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 6 }}>Status</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Check size={moderateScale(16)} color={theme.colors.success} />
            <Text style={{ fontSize: moderateScale(15) }} color="success">Confirmed</Text>
          </View>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 6 }}>Date</Text>
          <Text style={{ fontSize: moderateScale(16), fontWeight: '600' }}>{dateText}</Text>
        </View>
      </View>

      {/* From / To row — real, truncated addresses on BOTH sides, never a
          generic "You" placeholder. Icons match the prototype's own fixed
          per-side choice exactly (From: arrow-up-right/red, To: bookmark/
          light-green) rather than varying by direction. */}
      <View
        style={{
          flexDirection: 'row',
          gap: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 6 }}>From</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: moderateScale(24), height: moderateScale(24), borderRadius: moderateScale(6),
                backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={moderateScale(13)} color="#FFFFFF" />
            </View>
            <Text variant="mono" mono numberOfLines={1} style={{ flexShrink: 1 }}>{shortAddr(fromAddress)}</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end' }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 6 }}>To</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: moderateScale(24), height: moderateScale(24), borderRadius: moderateScale(6),
                backgroundColor: '#D9F99D', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bookmark size={moderateScale(13)} color="#365314" />
            </View>
            <Text variant="mono" mono numberOfLines={1} style={{ flexShrink: 1 }}>{shortAddr(toAddress)}</Text>
          </View>
        </View>
      </View>

      {/* "Nonce" — see file header comment: labeled per the design, but the
          real number is this transaction's block number, not a true nonce */}
      {tx.blockNumber != null && (
        <View style={{ paddingVertical: 12 }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 4 }}>Nonce</Text>
          <Text style={{ fontSize: moderateScale(18), fontWeight: '600' }}>#{tx.blockNumber}</Text>
        </View>
      )}

      <Card style={{ marginTop: 8, padding: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 13 }}>
          <Text style={{ fontSize: moderateScale(14) }}>Amount</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '500' }}>{tx.fiatValue}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 13,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: moderateScale(14) }}>Estimated gas fee</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '500' }} color={isSponsoredNetwork ? 'success' : 'textPrimary'}>
            {isSponsoredNetwork ? 'Free · sponsored' : '—'}
          </Text>
        </View>
        <View style={{ padding: 13, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: moderateScale(14), fontWeight: '500' }}>Total amount</Text>
            <Text style={{ fontSize: moderateScale(14), fontWeight: '700' }}>{tx.fiatValue}</Text>
          </View>
          <Text variant="small" color="textSecondary" style={{ textAlign: 'right', marginTop: 2 }}>
            {tx.amount} {tx.token.symbol}{isSponsoredNetwork ? ' / 0 ETH' : ''}
          </Text>
        </View>
      </Card>

      <Pressable
        onPress={() => Linking.openURL(explorer.url(tx.id))}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'auto', paddingVertical: 18 }}
      >
        <Text style={{ fontSize: moderateScale(15), fontWeight: '500' }} color="brand">View on {explorer.name}</Text>
        <ExternalLink size={moderateScale(14)} color={theme.colors.brand} />
      </Pressable>
    </Screen>
  );
}
