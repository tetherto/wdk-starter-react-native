import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useWallet } from '../contexts/wallet-context';

export default function Index() {
  const { wallet, isInitialized, isUnlocked, initializeWDK } = useWallet();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkForExistingWallet();
  }, [isInitialized]);

  const checkForExistingWallet = async () => {
    try {
      // Initialize WDK services first
      await initializeWDK();
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize WDK:', error);
      setIsLoading(false);
    }
  };

  const hasWallet = !!wallet;

  // Show loading indicator while checking
  if (isLoading || !isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#121212',
        }}
      >
        <ActivityIndicator size="large" color="#FF6501" />
      </View>
    );
  }

  // Redirect based on wallet existence and unlock status
  if (!hasWallet) {
    return <Redirect href="/onboarding" />;
  }

  // If wallet exists but is not unlocked, go to authorization
  // If wallet is already unlocked (e.g., just created/imported), go directly to wallet
  return <Redirect href={isUnlocked ? '/wallet' : '/authorize'} />;
}
