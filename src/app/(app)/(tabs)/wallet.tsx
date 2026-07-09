import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react-native';
import { Screen, Text, Card, Button, ListItem, TokenIcon, LoadingState, ErrorState } from '@/components';
import { useTheme } from '@/theme';
import { useBalances, useAccounts } from '@/data';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

export default function WalletHome() {
  const theme = useTheme();
  const router = useRouter();
  const accountsQ = useAccounts();
  const account = accountsQ.data?.[0];
  const balancesQ = useBalances(account?.id ?? '');

  if (accountsQ.isLoading || balancesQ.isLoading) return <LoadingState message="Loading wallet" />;
  if (balancesQ.isError) return <ErrorState message="Couldn't load balances." onRetry={() => balancesQ.refetch()} />;

  const balances = balancesQ.data ?? [];

  return (
    <Screen noPadding edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPaddingH, paddingTop: theme.layout.screenPaddingTop }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push('/accounts')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <Text variant="headTitle">{account?.name ?? 'Account'}</Text>
          <ChevronDown size={18} color={theme.colors.textSecondary} />
        </Pressable>

        <Text variant="small" color="textSecondary">Total balance</Text>
        <Text variant="balance" style={{ marginTop: 4 }}>{account?.fiatTotal ?? '$0.00'}</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Button label="Send" icon={<ArrowUp size={18} color={theme.colors.white} />} onPress={() => router.push('/send')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Receive" variant="tinted" icon={<ArrowDown size={18} color={theme.colors.textPrimary} />} onPress={() => router.push('/receive')} />
          </View>
        </View>

        <Text variant="h2" style={{ marginBottom: 8 }}>Tokens</Text>
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {balances.map((b, i) => (
            <ListItem
              key={b.token.id}
              divider={i < balances.length - 1}
              leading={<TokenIcon color={chainColor[b.token.chain]} symbol={b.token.symbol[0]} badge={{ color: chainColor[b.token.chain], label: b.token.chain[0].toUpperCase() }} />}
              trailing={<Text variant="tokenName">{b.fiatValue}</Text>}
            >
              <Text variant="tokenName">{b.token.symbol}</Text>
              <Text variant="small" color="textSecondary">{b.amount} · {b.token.chain}</Text>
            </ListItem>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
