import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useRouter } from 'expo-router';
import { Fingerprint, Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthorizeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, unlockWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthorize();
  }, []);

  const handleAuthorize = async () => {
    if (!wallet) {
      Alert.alert('Error', 'No wallet found');
      router.replace('/onboarding');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isDone = await unlockWallet();
      if (isDone) {
        router.replace('/wallet');
      }
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to unlock wallet');
      return;
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    handleAuthorize();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={80} color="#FF6501" />
        </View>

        <Text style={styles.title}>Authorize Access</Text>
        <Text style={styles.subtitle}>Verify your identity to access your wallet</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6501" />
            <Text style={styles.loadingText}>Initializing wallet...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleBiometricAuth}
              disabled={isLoading}
            >
              <Fingerprint size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Use Biometric</Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
    backgroundColor: '#121212',
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
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 50,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    color: '#999',
    marginTop: 16,
    fontSize: 14,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6501',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  secondaryButtonText: {
    color: '#FF6501',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  errorContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#FF3B301A',
    borderRadius: 8,
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
