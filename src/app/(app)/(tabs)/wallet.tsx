import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  ScanLine,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
} from 'lucide-react-native';
import { Screen, Text, LoadingState, ErrorState, AssetIcon } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkBalances, useWdkAccount, useWdkTotalUsd } from '@/wdk/hooks/useWalletData';
import { useAccounts } from '@/state/accounts';
import { useToast } from '@/state/toast';

/**
 * Home (Wallet) — matches the prototype's `home` screen exactly: account
 * selector + scan button header, total balance, a 4-button action row
 * (Send/Receive real; Swap/Buy are "coming soon" placeholders, same as the
 * prototype), a Tokens list, and a bottom Wallet/Activity tab bar.
 *
 * Balances come from useWdkBalances(), which already generically iterates
 * whatever's in the asset registry (src/wdk/assets.ts) — this screen needed
 * NO changes to work with 3 networks instead of 1, which is the whole point
 * of that hook being asset-list-driven rather than hardcoded per-chain.
 *
 * KNOWN GAP, stated plainly: there's no fiat price feed integrated yet, so
 * "Total balance" and each row's fiat sub-amount show '—' instead of a real
 * dollar figure. The prototype's "$2,847.32" is illustrative mockup data,
 * not something this screen can compute honestly yet.
 */
export default function WalletHome() {
  const theme = useTheme();
  const router = useRouter();
  const { moderateScale } = useResponsive();
  const account = useWdkAccount();
  const balances = useWdkBalances();
  const { total } = useWdkTotalUsd();
  const activeIndex = useAccounts((s) => s.activeIndex);

  if (account.isLoading || balances.isLoading) return <LoadingState message="Loading wallet" />;
  if (balances.isError) return <ErrorState message="Couldn't load balances." onRetry={() => balances.refetch()} />;

  // Matches the prototype's actual behavior exactly: a bottom toast that
  // auto-hides, not a native Alert dialog.
  const comingSoon = (feature: string) => useToast.getState().show(`${feature} coming soon`);

  return (
    <Screen noPadding edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPaddingH,
          paddingTop: theme.layout.screenPaddingTop,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: account selector + scan */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.push('/accounts')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <View
              style={{
                width: moderateScale(32),
                height: moderateScale(32),
                borderRadius: moderateScale(16),
                backgroundColor: theme.colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Was hardcoded to always show "1" — now reflects whichever
                  account is actually active (see src/state/accounts.ts). */}
              <Text variant="label" color="white" style={{ fontWeight: '700', fontSize: moderateScale(13) }}>
                {activeIndex + 1}
              </Text>
            </View>
            <Text variant="body">{account.data?.name ?? 'Account 1'}</Text>
            <ChevronDown size={moderateScale(16)} color={theme.colors.textSecondary} />
          </Pressable>

          {/* Matches the prototype exactly: Scan looks identical to any other
              active control — the "coming soon" affordance is the toast on
              tap, not a dimmed/disabled visual state. */}
          <Pressable
            onPress={() => comingSoon('Scan')}
            style={{
              width: moderateScale(36),
              height: moderateScale(36),
              borderRadius: moderateScale(18),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScanLine size={moderateScale(20)} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Total balance */}
        <View style={{ alignItems: 'center', paddingVertical: moderateScale(14) }}>
          <Text variant="label" color="textSecondary">Total balance</Text>
          {/* Real USD total via CoinGecko pricing (see wdk/pricing.ts) —
              was a hardcoded '—' before; this is the Phase 1 PRD's
              "one total amount in USD across all tokens + chains". */}
          <Text variant="balance" style={{ marginTop: 6 }}>{total}</Text>
        </View>

        {/* Action row: Send / Receive / Swap / Buy */}
        <View style={{ flexDirection: 'row', gap: 10, marginVertical: moderateScale(8) }}>
          <ActionButton icon={<ArrowUpRight size={moderateScale(20)} color={theme.colors.textPrimary} />} label="Send" onPress={() => router.push('/send')} />
          <ActionButton icon={<ArrowDownLeft size={moderateScale(20)} color={theme.colors.textPrimary} />} label="Receive" onPress={() => router.push('/receive')} />
          <ActionButton icon={<ArrowLeftRight size={moderateScale(20)} color={theme.colors.textPrimary} />} label="Swap" onPress={() => comingSoon('Swap')} />
          <ActionButton icon={<CreditCard size={moderateScale(20)} color={theme.colors.textPrimary} />} label="Buy" onPress={() => comingSoon('Buy')} />
        </View>

        {/* Tokens */}
        <Text variant="label" style={{ marginBottom: 4, fontWeight:'bold', marginTop:10 }}>Tokens</Text>
        <View>
          {balances.data.map((b, i) => (
            <TokenRow
              key={b.token.id}
              symbol={b.token.symbol}
              subtitle={tokenSubtitle(b.token.id, b.token.chain)}
              amount={b.amount}
              fiatValue={b.fiatValue}
              network={b.token.chain}
              isLast={i === balances.data.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Chain name for the row subtitle (e.g. "Ethereum", "Arbitrum", "Polygon",
 * "Sepolia") — matches the prototype's per-row subtitle pattern. Tron/
 * GasFree's "· gasless" label removed along with the Tron integration
 * itself (on hold — see wdk/config.ts). */
function tokenSubtitle(_assetId: string, chain: string): string {
  return chain[0].toUpperCase() + chain.slice(1);
}

function ActionButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: moderateScale(62),
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.bgSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      {icon}
      <Text variant="small">{label}</Text>
    </Pressable>
  );
}

function TokenRow({
  symbol,
  subtitle,
  amount,
  fiatValue,
  network,
  isLast,
}: {
  symbol: string;
  subtitle: string;
  amount: string;
  fiatValue: string;
  network: string;
  isLast: boolean;
}) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const iconSize = moderateScale(38);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: moderateScale(12),
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <AssetIcon symbol={symbol} network={network} size={iconSize} showChainBadge={symbol.startsWith('USDT')} />
      <View style={{ flex: 1 }}>
        <Text variant="tokenName">{symbol}</Text>
        <Text variant="small" color="textSecondary">{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="tokenName">{amount}</Text>
        <Text variant="small" color="textSecondary">{fiatValue}</Text>
      </View>
    </View>
  );
}
