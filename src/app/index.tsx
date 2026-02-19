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

import { useWallet } from '@tetherto/wdk-react-native-provider';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { pricingService } from '../services/pricing-service';
import { colors } from '@/constants/colors';

export default function Index() {
  const { wallet, isInitialized, isUnlocked } = useWallet();
  const [isPricingReady, setIsPricingReady] = useState(false);

  const initializePricing = async () => {
    try {
      await pricingService.initialize();
      setIsPricingReady(true);
    } catch (error) {
      console.error('Failed to initialize pricing service:', error);
      // Still set to true to allow app to continue even if pricing fails
      setIsPricingReady(true);
    }
  };

  useEffect(() => {
    initializePricing();
  }, []);

  // Show loading indicator while WDK and pricing service are being initialized
  if (!isInitialized || !isPricingReady) {
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

  // Redirect based on wallet existence and unlock status
  if (!wallet) {
    return <Redirect href="/onboarding" />;
  }

  // If wallet exists but is not unlocked, go to authorization
  // If wallet is already unlocked (e.g., just created/imported), go directly to wallet
  return <Redirect href={isUnlocked ? '/wallet' : '/authorize'} />;
}
