import { Wallet } from '@/services/wdk-service/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../contexts/wallet-context';

export default function CompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ walletName: string; mnemonic: string }>();
  const { createWallet, isLoading, error, addWallet } = useWallet();
  const [walletCreated, setWalletCreated] = useState(false);
  const [createdWallet, setCreatedWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    // Auto-create wallet when screen loads
    createWalletWithWDK();
  }, []);

  const createWalletWithWDK = async () => {
    if (walletCreated) return;

    try {
      const walletName = params.walletName || 'My Wallet';
      const mnemonic = params.mnemonic.split(',').join(' ');

      // Use the wallet context to create the wallet
      const wallet = await createWallet({
        name: walletName,
        type: 'primary',
        network: 'ethereum', // Start with Ethereum for USD₮ support
        icon: '💎', // Default icon for new wallets
        mnemonic,
      });

      console.log('Wallet created successfully:', wallet);
      setCreatedWallet(wallet);
      setWalletCreated(true);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      Alert.alert(
        'Wallet Creation Failed',
        'There was an issue creating your wallet. Please try again.',
        [{ text: 'Retry', onPress: () => createWalletWithWDK() }]
      );
    }
  };

  const handleGoToWallet = () => {
    if (!walletCreated) {
      Alert.alert('Please Wait', 'Wallet is still being created...');
      return;
    }
    // Reset navigation stack and go to main app
    router.replace('/wallet');
  };

  const generalLoadingStatus = !walletCreated || isLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {generalLoadingStatus ? 'Creating Your Wallet...' : "You're All Set!"}
        </Text>
        <Text style={styles.subtitle}>
          {generalLoadingStatus
            ? 'Setting up your secure multi-chain wallet. This will only take a moment...'
            : 'Your wallet is ready to use. Start exploring and managing your crypto securely.'}
        </Text>
        {generalLoadingStatus && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Initializing wallet...</Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.button, generalLoadingStatus && styles.buttonDisabled]}
          onPress={handleGoToWallet}
          disabled={generalLoadingStatus}
        >
          <Text style={[styles.buttonText, generalLoadingStatus && styles.buttonTextDisabled]}>
            {generalLoadingStatus ? 'Creating Wallet...' : 'Go To Wallet'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    backgroundColor: '#FF6501',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    backgroundColor: '#1E1E1E',
  },
  buttonTextDisabled: {
    color: '#666',
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    fontSize: 14,
  },
});
