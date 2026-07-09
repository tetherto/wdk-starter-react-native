import React from 'react';
import { useRouter } from 'expo-router';
import { Screen, ScreenHeader, Card, ListItem, Text, Button, LoadingState, ErrorState } from '@/components';
import { useAccounts } from '@/data';

export default function Accounts() {
  const router = useRouter();
  const accountsQ = useAccounts();

  return (
    <Screen scroll>
      <ScreenHeader title="Accounts" onBack={() => router.back()} />
      {accountsQ.isLoading ? (
        <LoadingState message="Loading accounts" />
      ) : accountsQ.isError ? (
        <ErrorState message="Couldn't load accounts." onRetry={() => accountsQ.refetch()} />
      ) : (
        <>
          <Card style={{ padding: 0, paddingHorizontal: 16 }}>
            {(accountsQ.data ?? []).map((a, i, arr) => (
              <ListItem key={a.id} divider={i < arr.length - 1} onPress={() => router.back()} trailing={<Text variant="body">{a.fiatTotal}</Text>}>
                <Text variant="tokenName">{a.name}</Text>
                <Text variant="small" color="textSecondary">{a.address}</Text>
              </ListItem>
            ))}
          </Card>
          <Button label="Add account" variant="secondary" onPress={() => {}} />
        </>
      )}
    </Screen>
  );
}
