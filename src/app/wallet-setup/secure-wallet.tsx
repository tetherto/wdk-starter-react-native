import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ChevronLeft, CloudUpload, Copy } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SeedPhrase } from '@tetherto/wdk-uikit-react-native';
import { WDKService } from '../../services/wdk-service';

export default function SecureWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    walletName?: string;
    avatar?: string;
  }>();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    // Generate mnemonic using WDK on mount
    generateMnemonic();
  }, []);

  const generateMnemonic = async () => {
    try {
      setIsGenerating(true);
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
      console.error('Failed to generate mnemonic:', error);

      let errorMessage = 'Failed to generate seed phrase. Please try again.';
      if ((error as Error).message) {
        errorMessage = `Failed to generate seed phrase: ${(error as Error).message}`;
      }

      Alert.alert('Error', errorMessage, [
        {
          text: 'Retry',
          onPress: () => generateMnemonic(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPhrase = () => {
    const phraseText = mnemonic.join(' ');
    Clipboard.setString(phraseText);
    Alert.alert('Copied!', 'Secret phrase copied to clipboard', [{ text: 'OK' }]);
  };

  const handleBackup = () => {
    setShowBackupModal(true);
  };

  const handleSavePhrase = () => {
    setShowBackupModal(false);
    setHasBackedUp(true);
  };

  const handleSkipForNow = () => {
    setShowBackupModal(false);
  };

  const handleNext = () => {
    if (!hasBackedUp) {
      Alert.alert('Backup Required', 'Please backup your secret phrase before continuing.', [
        { text: 'OK' },
      ]);
      return;
    }
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

  const handleSkip = () => {
    Alert.alert(
      'Skip Backup?',
      'You can backup your secret phrase later from settings, but you risk losing access to your wallet.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () =>
            router.push({
              pathname: './complete',
              params: { walletName: params.walletName, avatar: params.avatar },
            }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
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

        <SeedPhrase words={mnemonic} editable={false} isLoading={isGenerating} />

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyPhrase}>
            <Copy size={20} color="#FF6501" />
            <Text style={styles.actionButtonText}>Copy Phrase</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, hasBackedUp && styles.actionButtonActive]}
            onPress={handleBackup}
          >
            <CloudUpload size={20} color={hasBackedUp ? '#00C853' : '#FF6501'} />
            <Text style={[styles.actionButtonText, hasBackedUp && styles.actionButtonTextActive]}>
              {hasBackedUp ? 'Backed Up' : 'Backup'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, !hasBackedUp && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !hasBackedUp && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Backup Warning Modal */}
      <Modal
        visible={showBackupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Don&apos;t Lose Access to Your Wallet</Text>
            <Text style={styles.modalMessage}>
              Your secret phrase is the only way to recover your wallet. If you lose it, your funds
              will be permanently inaccessible. Save it now to stay in control.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkipForNow}>
                <Text style={styles.skipButtonText}>Skip For Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSavePhrase}>
                <Text style={styles.saveButtonText}>Save Phrase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionButtonActive: {
    backgroundColor: 'rgba(0, 200, 83, 0.1)',
    borderColor: '#00C853',
  },
  actionButtonText: {
    color: '#FF6501',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButtonTextActive: {
    color: '#00C853',
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
    backgroundColor: '#1E1E1E',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  nextButtonTextDisabled: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'left',
  },
  modalMessage: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6501',
  },
  skipButtonText: {
    color: '#FF6501',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6501',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
