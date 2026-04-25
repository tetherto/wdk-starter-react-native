// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

  const walletExists = wallets.some(w => w.exists);

  if (!walletExists) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href={isInitialized ? '/wallet' : '/authorize'} />;
}
