import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, Text, Button, LoadingState } from '@/components';
import { useWdkAccount } from '@/wdk/hooks/useWalletData';

export default function Accounts() {
  const router = useRouter();
  const account = useWdkAccount();

  return (
    <Screen scroll>
      <ScreenHeader title="Accounts" onBack={() => router.back()} />
      {account.isLoading ? (
        <LoadingState message="Loading accounts" />
      ) : (
        <>
          <Card style={{ padding: 0, paddingHorizontal: 16 }}>
            <ListItem divider={false} onPress={() => router.back()} trailing={<Text variant="body">{account.data?.fiatTotal ?? '—'}</Text>}>
              <Text variant="tokenName">{account.data?.name ?? 'Account 1'}</Text>
              <Text variant="small" color="textSecondary">{account.data?.address || '—'}</Text>
            </ListItem>
          </Card>
          <Button label="Add account" variant="secondary" onPress={() => {}} />
        </>
      )}
    </Screen>
  );
}
