import React, { useState, useMemo } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Text, AssetIcon, LoadingState, EmptyState } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkBalances } from '@/wdk/hooks/useWalletData';

/**
 * Send — pick token. Matches the prototype's `send-pick` screen exactly: a
 * search field, then the same `.tok` row pattern already established on the
 * Home screen (icon + chain badge via the shared AssetIcon, name, subtitle,
 * amount + fiat), each row tappable to continue to send/amount.
 *
 * Real balances via useWdkBalances() — same live data as Home, not a
 * separate/duplicated fetch. Subtitle logic matches wallet.tsx's current
 * convention exactly (plain capitalized chain name) rather than
 * reintroducing Receive's more detailed "· ERC-20 · gasless" wording —
 * consistency with Home, since this screen is effectively its sibling.
 */
export default function SendPick() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const balances = useWdkBalances();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return balances.data;
    const q = query.trim().toLowerCase();
    return balances.data.filter(
      (b) => b.token.symbol.toLowerCase().includes(q) || b.token.chain.toLowerCase().includes(q),
    );
  }, [balances.data, query]);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Send" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 12 }}>Pick a token to send.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search token"
        placeholderTextColor={theme.colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: theme.colors.bgSecondary,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingVertical: moderateScale(12),
          paddingHorizontal: moderateScale(14),
          fontSize: moderateScale(15),
          color: theme.colors.textPrimary,
          marginBottom: 8,
        }}
      />

      {balances.isLoading ? (
        <LoadingState message="Loading assets" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching assets" message="Try a different search." />
      ) : (
        <View>
          {filtered.map((b, i) => (
            <Pressable
              key={b.token.id}
              onPress={() => router.push(`/send/amount?tokenId=${b.token.id}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: moderateScale(12),
                borderBottomWidth: i === filtered.length - 1 ? 0 : 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <AssetIcon
                symbol={b.token.symbol}
                network={b.token.chain}
                size={moderateScale(38)}
                showChainBadge={b.token.symbol.startsWith('USDT')}
              />
              <View style={{ flex: 1 }}>
                <Text variant="tokenName">{b.token.symbol}</Text>
                <Text variant="small" color="textSecondary">
                  {b.token.chain[0].toUpperCase() + b.token.chain.slice(1)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="tokenName">{b.amount}</Text>
                <Text variant="small" color="textSecondary">{b.fiatValue}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
