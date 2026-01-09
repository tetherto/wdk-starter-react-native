import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { Fingerprint, Shield, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import getErrorMessage from '@/utils/get-error-message';

export default function AuthorizeScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { hasWallet, initializeWallet, deleteWallet, wallets } = useWalletManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthorize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthorize = async () => {
    if (wallets.length === 0) {
      Alert.alert('Error', 'No wallet found');
      router.replace('/onboarding');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletId = wallets[0].identifier;
      await initializeWallet({ walletId });
      router.replace('/wallet');
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      setError(getErrorMessage(error, 'Failed to unlock wallet'));
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    handleAuthorize();
  };

  const handleResetWallet = () => {
    Alert.alert(
      'Reset Wallet',
      'This will delete all wallet data. You will need to create or import a wallet again. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              for (const wallet of wallets) {
                await deleteWallet(wallet.identifier);
              }
              router.replace('/onboarding');
            } catch (err) {
              setError(getErrorMessage(err, 'Failed to reset wallet'));
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>Authorize Access</Text>
        <Text style={styles.subtitle}>Verify your identity to access your wallet</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Initializing wallet...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleBiometricAuth}
              disabled={isLoading}
            >
              <Fingerprint size={24} color={colors.white} />
              <Text style={styles.primaryButtonText}>Use Biometric</Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {error && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetWallet}
            disabled={isLoading}
          >
            <Trash2 size={20} color={colors.danger} />
            <Text style={styles.resetButtonText}>Reset Wallet</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.footer, { marginBottom: insets.bottom + 20 }]}>
        <Text style={styles.footerText}>Your wallet is encrypted and secured with your device</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 50,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  errorContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: colors.dangerBackground,
    borderRadius: 8,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
  },
  resetButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
