import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, Text, ListItem, TokenIcon, EmptyState } from '@/components';
import { mockWalletRepository } from '@/data/mock/mockWalletRepository';
import type { Transaction } from '@/domain/models';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

export default function Activity() {
  const router = useRouter();
  const [txs, setTxs] = useState<Transaction[]>([]);
  useEffect(() => { mockWalletRepository.getTransactions('1').then(setTxs); }, []);

  return (
    <Screen scroll edges={['top']}>
      <Text variant="h1" style={{ marginBottom: 16 }}>Activity</Text>
      {txs.length === 0 ? (
        <EmptyState title="No activity yet" message="Your transactions will appear here." />
      ) : (
        txs.map((t, i) => (
          <ListItem
            key={t.id}
            divider={i < txs.length - 1}
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
