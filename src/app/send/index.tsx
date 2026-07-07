import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, TokenIcon, Text } from '@/components';
import { mockWalletRepository } from '@/data/mock/mockWalletRepository';
import type { TokenBalance } from '@/domain/models';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

/** Send step 1: pick which token to send. */
export default function SendPick() {
  const router = useRouter();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  useEffect(() => { mockWalletRepository.getBalances('1').then(setBalances); }, []);
  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Send" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 12 }}>Choose an asset to send.</Text>
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        {balances.map((b, i) => (
          <ListItem
            key={b.token.id}
            divider={i < balances.length - 1}
            onPress={() => router.push(`/send/amount?tokenId=${b.token.id}`)}
            leading={<TokenIcon color={chainColor[b.token.chain]} symbol={b.token.symbol[0]} />}
            trailing={<Text variant="body">{b.amount}</Text>}
          >
            <Text variant="tokenName">{b.token.symbol}</Text>
            <Text variant="small" color="textSecondary">{b.token.chain}</Text>
          </ListItem>
        ))}
      </Card>
    </Screen>
  );
}
