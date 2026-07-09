import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, TokenIcon, Text, LoadingState, ErrorState } from '@/components';
import { useAccounts, useBalances } from '@/data';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

export default function SendPick() {
  const router = useRouter();
  const accountsQ = useAccounts();
  const account = accountsQ.data?.[0];
  const balancesQ = useBalances(account?.id ?? '');

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Send" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 12 }}>Choose an asset to send.</Text>
      {balancesQ.isLoading ? (
        <LoadingState message="Loading assets" />
      ) : balancesQ.isError ? (
        <ErrorState message="Couldn't load assets." onRetry={() => balancesQ.refetch()} />
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {(balancesQ.data ?? []).map((b, i, arr) => (
            <ListItem
              key={b.token.id}
              divider={i < arr.length - 1}
              onPress={() => router.push(`/send/amount?tokenId=${b.token.id}`)}
              leading={<TokenIcon color={chainColor[b.token.chain]} symbol={b.token.symbol[0]} />}
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
