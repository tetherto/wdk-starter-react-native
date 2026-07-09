import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, Text, ListItem, TokenIcon, EmptyState, LoadingState, ErrorState } from '@/components';
import { useAccounts, useTransactions } from '@/data';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

export default function Activity() {
  const router = useRouter();
  const accountsQ = useAccounts();
  const account = accountsQ.data?.[0];
  const txQ = useTransactions(account?.id ?? '');

  return (
    <Screen scroll edges={['top']}>
      <Text variant="h1" style={{ marginBottom: 16 }}>Activity</Text>
      {txQ.isLoading ? (
        <LoadingState message="Loading activity" />
      ) : txQ.isError ? (
        <ErrorState message="Couldn't load transactions." onRetry={() => txQ.refetch()} />
      ) : (txQ.data ?? []).length === 0 ? (
        <EmptyState title="No activity yet" message="Your transactions will appear here." />
      ) : (
        (txQ.data ?? []).map((t, i, arr) => (
          <ListItem
            key={t.id}
            divider={i < arr.length - 1}
            onPress={() => router.push(`/tx/${t.id}`)}
            leading={<TokenIcon color={chainColor[t.token.chain]} symbol={t.token.symbol[0]} />}
            trailing={<Text variant="tokenName" color={t.direction === 'in' ? 'success' : 'textPrimary'}>{t.direction === 'in' ? '+' : '-'}{t.fiatValue}</Text>}
          >
            <Text variant="tokenName">{t.direction === 'in' ? 'Received' : 'Sent'} {t.token.symbol}</Text>
            <Text variant="small" color="textSecondary">{t.address} · {t.status}</Text>
          </ListItem>
        ))
      )}
    </Screen>
  );
}
