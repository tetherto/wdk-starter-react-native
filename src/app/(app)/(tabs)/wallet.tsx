import React, { useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react-native';
import { Screen, Text, Card, Button, ListItem, TokenIcon, LoadingState, ErrorState } from '@/components';
import { useTheme } from '@/theme';
import { useWdkBalances, useWdkAccount, networkColor } from '@/wdk/hooks/useWalletData';
import { useWdkApp } from '@tetherto/wdk-react-native-core';

export default function WalletHome() {
  const theme = useTheme();
  const router = useRouter();
  const account = useWdkAccount();
  const balances = useWdkBalances();

  if (account.isLoading || balances.isLoading) return <LoadingState message="Loading wallet" />;
  if (balances.isError) return <ErrorState message="Couldn't load balances." onRetry={() => {}} />;

  const list = balances.data;
  
  return (
    <Screen noPadding edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPaddingH, paddingTop: theme.layout.screenPaddingTop }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push('/accounts')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <Text variant="headTitle">{account.data?.name ?? 'Account'}</Text>
          <ChevronDown size={18} color={theme.colors.textSecondary} />
        </Pressable>

        <Text variant="small" color="textSecondary">Total balance</Text>
        <Text variant="balance" style={{ marginTop: 4 }}>{account.data?.fiatTotal ?? '—'}</Text>

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
          {list.map((b, i) => (
            <ListItem
              key={b.token.id}
              divider={i < list.length - 1}
              leading={<TokenIcon color={networkColor[b.token.chain] ?? '#888'} symbol={b.token.symbol[0]} />}
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
