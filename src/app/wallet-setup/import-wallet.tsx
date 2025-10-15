import { SeedPhrase } from '@/components/SeedPhrase';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { ChevronLeft, Download, FileText, ScanText } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ImportWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [secretWords, setSecretWords] = useState<string[]>(Array(12).fill(''));

  const handleWordChange = (index: number, text: string) => {
    const newWords = [...secretWords];
    newWords[index] = text.trim().toLowerCase();
    setSecretWords(newWords);
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();

      if (!clipboardContent.trim()) {
        Alert.alert('Empty Clipboard', 'No text found in clipboard', [{ text: 'OK' }]);
        return;
      }

      const words = clipboardContent.trim().split(/\s+/).slice(0, 12);

      if (words.length < 12) {
        Alert.alert(
          'Invalid Phrase',
          `Found only ${words.length} words in clipboard. Please ensure you have exactly 12 words.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const newWords = [...secretWords];
      words.forEach((word, index) => {
        if (index < 12) {
          newWords[index] = word.toLowerCase().trim();
        }
      });
      setSecretWords(newWords);

      Alert.alert('Success!', '12 words have been pasted from clipboard', [{ text: 'OK' }]);
    } catch (error) {
      console.error('Paste error:', error);
      Alert.alert('Error', 'Could not paste from clipboard', [{ text: 'OK' }]);
    }
  };

  const handleScanText = () => {
    Alert.alert('Scan Text', 'Camera functionality would open here to scan QR code or text', [
      { text: 'OK' },
    ]);
  };

  const isFormValid = () => {
    return secretWords.every(word => word.trim().length > 0);
  };

  const validateSeedPhrase = (phrase: string): boolean => {
    const words = phrase
      .trim()
      .split(' ')
      .filter(word => word.length > 0);

    // Check if we have exactly 12 or 24 words
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }

    // Basic word validation - each word should be at least 3 characters
    const validWords = words.every(
      word => word.length >= 3 && /^[a-z]+$/.test(word) // only lowercase letters
    );

    return validWords;
  };

  const handleImportWallet = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete', 'Please fill in all 12 words of your secret phrase', [
        { text: 'OK' },
      ]);
      return;
    }

    // Join the words into a seed phrase
    const seedPhrase = secretWords.join(' ');

    // Validate the seed phrase
    if (!validateSeedPhrase(seedPhrase)) {
      Alert.alert(
        'Invalid Seed Phrase',
        'Please check your seed phrase. Make sure all words are spelled correctly and contain only lowercase letters.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to name wallet screen with the seed phrase
    router.push({
      pathname: './import-name-wallet',
      params: { seedPhrase: encodeURIComponent(seedPhrase) },
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

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Import via Secret Phrase</Text>

          <SeedPhrase words={secretWords} editable={true} onWordChange={handleWordChange} />

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handlePaste}>
              <FileText size={20} color="#FF6501" />
              <Text style={styles.actionButtonText}>Paste</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleScanText}>
              <ScanText size={20} color="#FF6501" />
              <Text style={styles.actionButtonText}>Scan Text</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.importButton, !isFormValid() && styles.importButtonDisabled]}
          onPress={handleImportWallet}
        >
          <Download size={20} color={isFormValid() ? '#000' : '#666'} />
          <Text
            style={[styles.importButtonText, !isFormValid() && styles.importButtonTextDisabled]}
          >
            Import Wallet
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
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
  importButton: {
    backgroundColor: '#FF6501',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  importButtonDisabled: {
    backgroundColor: '#1E1E1E',
  },
  importButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  importButtonTextDisabled: {
    color: '#666',
  },
});
