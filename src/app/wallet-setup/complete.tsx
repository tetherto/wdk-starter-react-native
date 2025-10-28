import { CommonActions, useNavigation } from '@react-navigation/native';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

export default function CompleteScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ walletName: string; mnemonic: string }>();
  const { createWallet, isLoading } = useWallet();
  const [walletCreated, setWalletCreated] = useState(false);

  useEffect(() => {
    // Auto-create wallet when screen loads
    createWalletWithWDK();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createWalletWithWDK = async () => {
    if (walletCreated) return;

    try {
      const walletName = params.walletName || 'My Wallet';
      const mnemonic = params.mnemonic.split(',').join(' ');

      // Use the wallet context to create the wallet
      await createWallet({
        name: walletName,
        mnemonic,
      });

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
    // Reset navigation stack completely - only wallet screen will remain
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'wallet' }],
      })
    );
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
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 16,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  buttonDisabled: {
    backgroundColor: colors.card,
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
