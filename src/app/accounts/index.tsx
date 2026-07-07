import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, Text, Button } from '@/components';
import { mockWalletRepository } from '@/data/mock/mockWalletRepository';
import type { Account } from '@/domain/models';

export default function Accounts() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  useEffect(() => { mockWalletRepository.listAccounts().then(setAccounts); }, []);
  return (
    <Screen scroll>
      <ScreenHeader title="Accounts" onBack={() => router.back()} />
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        {accounts.map((a, i) => (
          <ListItem key={a.id} divider={i < accounts.length - 1} onPress={() => router.back()} trailing={<Text variant="body">{a.fiatTotal}</Text>}>
            <Text variant="tokenName">{a.name}</Text>
            <Text variant="small" color="textSecondary">{a.address}</Text>
          </ListItem>
        ))}
      </Card>
      <Button label="Add account" variant="secondary" onPress={() => {}} />
    </Screen>
  );
}
