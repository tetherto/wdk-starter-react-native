import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, TokenIcon, Text, LoadingState, EmptyState } from '@/components';
import { useWdkBalances, networkColor } from '@/wdk/hooks/useWalletData';

export default function SendPick() {
  const router = useRouter();
  const balances = useWdkBalances();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Send" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 12 }}>Choose an asset to send.</Text>
      {balances.isLoading ? (
        <LoadingState message="Loading assets" />
      ) : balances.data.length === 0 ? (
        <EmptyState title="No assets" message="Your assets will appear here." />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {balances.data.map((b, i, arr) => (
            <ListItem
              key={b.token.id}
              divider={i < arr.length - 1}
              onPress={() => router.push(`/send/amount?tokenId=${b.token.id}`)}
              leading={<TokenIcon color={networkColor[b.token.chain] ?? '#888'} symbol={b.token.symbol[0]} />}
              trailing={<Text variant="body">{b.amount}</Text>}
            >
              <Text variant="tokenName">{b.token.symbol}</Text>
              <Text variant="small" color="textSecondary">{b.token.chain}</Text>
            </ListItem>
          ))}
        </Card>
      )}
    </Screen>
  );
}
