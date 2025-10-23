import { SeedPhrase } from '@/components/SeedPhrase';
import { WDKService } from '@tetherto/wdk-react-native-provider';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { AlertCircle, ChevronLeft, Copy, Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import parseWorkletError from '@/utils/parse-worklet-error';
import { toast } from 'sonner-native';

export default function SecureWalletScreen() {
  const router = useDebouncedNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    walletName?: string;
    avatar?: string;
  }>();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [showPhrase, setShowPhrase] = useState(true);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate mnemonic using WDK on mount
    generateMnemonic();
  }, []);

  const generateMnemonic = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const prf = await getUniqueId();
      const mnemonicString = await WDKService.createSeed({ prf });

      if (!mnemonicString) {
        throw new Error('Received empty mnemonic');
      }

      const words = mnemonicString.split(' ');
      if (words.length !== 12) {
        throw new Error(`Invalid mnemonic length: expected 12 words, got ${words.length}`);
      }

      setMnemonic(words);
    } catch (error) {
      console.error('Failed to generate mnemonic', error);

      let errorMessage = 'Failed to generate seed phrase. Please try again.';
      if ((error as Error).message) {
        const workletError = parseWorkletError(error);
        errorMessage = `Failed to generate seed phrase: ${workletError ? workletError.message : (error as Error).message}`;
      }

      setError(errorMessage);
      setMnemonic([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPhrase = async () => {
    const phraseText = mnemonic.join(' ');
    await Clipboard.setStringAsync(phraseText);
    toast.success('Secret phrase copied to clipboard');
  };

  const handleToggleVisibility = () => {
    setShowPhrase(!showPhrase);
  };

  const handleNext = () => {
    // Pass wallet data to next screen
    router.push({
      pathname: './confirm-phrase',
      params: {
        mnemonic: mnemonic.join(','),
        walletName: params.walletName,
        avatar: params.avatar,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Secure Your Wallet</Text>
        <Text style={styles.subtitle}>
          This secret phrase is the only way to recover your wallet. Store it safely.
        </Text>

        <View style={styles.warningBox}>
          <AlertCircle size={20} color="#FF9500" />
          <Text style={styles.warningText}>
            Never share your secret phrase with anyone! Anyone with this phrase can access your
            wallet.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorBox}>
              <AlertCircle size={24} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={generateMnemonic}
              disabled={isGenerating}
            >
              <Text style={styles.retryButtonText}>{isGenerating ? 'Generating...' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <SeedPhrase
              words={mnemonic}
              editable={false}
              isLoading={isGenerating}
              hidden={!showPhrase}
            />

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopyPhrase}>
                <Copy size={20} color="#FF6501" />
                <Text style={styles.actionButtonText}>Copy Phrase</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleToggleVisibility}>
                {showPhrase ? (
                  <EyeOff size={20} color="#FF6501" />
                ) : (
                  <Eye size={20} color="#FF6501" />
                )}
                <Text style={styles.actionButtonText}>
                  {showPhrase ? 'Hide Phrase' : 'Show Phrase'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, (error || mnemonic.length === 0) && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={error !== null || mnemonic.length === 0}
        >
          <Text
            style={[
              styles.nextButtonText,
              (error || mnemonic.length === 0) && styles.nextButtonTextDisabled,
            ]}
          >
            Next
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6501',
    fontSize: 16,
    marginLeft: 4,
  },
  skipText: {
    color: '#FF6501',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  warningText: {
    flex: 1,
    color: '#FF9500',
    fontSize: 14,
    marginLeft: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FF6501',
  },
  actionButtonText: {
    color: '#FF6501',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#FF6501',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  nextButtonTextDisabled: {
    color: '#666',
  },
  errorContainer: {
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 12,
  },
  retryButton: {
    backgroundColor: '#FF6501',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
