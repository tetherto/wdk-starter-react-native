import avatarOptions, { setAvatar } from '@/config/avatar-options';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { colors } from '@/constants/colors';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

export default function ImportNameWalletScreen() {
  const router = useDebouncedNavigation();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { createWallet } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [isImporting, setIsImporting] = useState(false);

  // Get the seed phrase from navigation params
  const seedPhrase = params.seedPhrase ? decodeURIComponent(params.seedPhrase as string) : '';

  const handleNext = async () => {
    if (!seedPhrase) {
      Alert.alert('Error', 'No seed phrase provided. Please go back and enter your seed phrase.');
      return;
    }

    setIsImporting(true);

    try {
      // Use the context's createWallet method which handles everything including unlocking
      await createWallet({ name: walletName, mnemonic: seedPhrase });
      await setAvatar(selectedAvatar.id);

      toast.success('Your wallet has been imported successfully.');

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'wallet' }],
        })
      );
    } catch (error: any) {
      console.error('Import wallet error:', error);
      Alert.alert(
        'Import Failed',
        error.message || 'Failed to import wallet. Please check your seed phrase and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsImporting(false);
    }
  };

  const isNextDisabled = walletName.length === 0 || isImporting;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Name Your Wallet</Text>
          <Text style={styles.subtitle}>This name is just for you and can be changed later.</Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Wallet Name*</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>💼</Text>
              <TextInput
                style={styles.input}
                value={walletName}
                onChangeText={setWalletName}
                placeholder="e.g., Investment Stash"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.avatarSection}>
            <Text style={styles.sectionTitle}>Choose an avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.map(avatar => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarItem,
                    { backgroundColor: avatar.color },
                    selectedAvatar.id === avatar.id && styles.selectedAvatar,
                  ]}
                  onPress={() => setSelectedAvatar(avatar)}
                >
                  <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled}
        >
          {isImporting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.textTertiary} />
              <Text
                style={[
                  styles.nextButtonText,
                  isNextDisabled && styles.nextButtonTextDisabled,
                  { marginLeft: 8 },
                ]}
              >
                Importing...
              </Text>
            </View>
          ) : (
            <Text style={[styles.nextButtonText, isNextDisabled && styles.nextButtonTextDisabled]}>
              Import Wallet
            </Text>
          )}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: colors.primary,
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
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
  avatarSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 20,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  avatarItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: colors.primary,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: colors.card,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  nextButtonTextDisabled: {
    color: colors.textTertiary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
