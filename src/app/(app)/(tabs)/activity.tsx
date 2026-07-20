import React from 'react';
import { Screen, Text, EmptyState, LoadingState } from '@/components';
import { useWdkTransactions } from '@/wdk/hooks/useWalletData';

export default function Activity() {
  const txQ = useWdkTransactions();
  return (
    <Screen scroll edges={['top']}>
      <Text variant="h1" style={{ marginBottom: 16 }}>Activity</Text>
      {txQ.isLoading ? (
        <LoadingState message="Loading activity" />
      ) : (
        <EmptyState title="No activity yet" message="Your transactions will appear here." />
      )}
    </Screen>
  );
}
