import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { pricingService } from '../services/pricing-service';
import { colors } from '@/constants/colors';

export default function Index() {
  const { wallets, activeWalletId, refreshWalletList } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { isInitialized } = useWallet({ walletId: currentWalletId });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await pricingService.initialize();
      } catch (error) {
        console.error('Failed to initialize pricing service:', error);
      }
      await refreshWalletList();
      setIsReady(true);
    };
    initialize();
  }, [refreshWalletList]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const walletExists = wallets.some((w) => w.exists);

  if (!walletExists) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={isInitialized ? '/wallet' : '/authorize'} />;
}
