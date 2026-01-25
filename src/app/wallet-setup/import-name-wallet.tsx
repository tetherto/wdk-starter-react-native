import avatarOptions from '@/config/avatar-options';
import { addWallet, createWalletEntry, setActiveWalletId, updateWallet } from '@/utils/wallet-storage';
import { saveWalletMnemonic } from '@/utils/wallet-secrets';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { clearWalletCache } from '@/utils/wallet-cache';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
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
  const { createWallet, addresses } = useWallet();
  const [walletName, setWalletName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);
  const [isImporting, setIsImporting] = useState(false);
  const addressesRef = useRef(addresses);

  useEffect(() => {
    addressesRef.current = addresses;
  }, [addresses]);

  // Get the seed phrase from navigation params
  const seedPhrase = params.seedPhrase ? decodeURIComponent(params.seedPhrase as string) : '';

  const getPrimaryAddress = (value?: typeof addresses) => {
    if (!value) return undefined;
    const candidate = Object.values(value).find(Boolean);
    return typeof candidate === 'string' ? candidate : undefined;
  };

  const getAddressMap = (value?: typeof addresses) => {
    if (!value) return undefined;
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1]
    );
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const areAddressMapsEqual = (
    left?: Record<string, string>,
    right?: Record<string, string>
  ) => {
    if (!left && !right) return true;
    if (!left || !right) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => left[key] === right[key]);
  };

  const waitForPrimaryAddress = async (previous?: string) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const next = getPrimaryAddress(addressesRef.current);
      if (next && next !== previous) {
        return next;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return getPrimaryAddress(addressesRef.current);
  };

  const handleNext = async () => {
    if (!seedPhrase) {
      Alert.alert('Error', 'No seed phrase provided. Please go back and enter your seed phrase.');
      return;
    }

    setIsImporting(true);

    try {
      const previousAddress = getPrimaryAddress(addressesRef.current);
      const previousAddressMap = getAddressMap(addressesRef.current);
      await clearWalletCache();
      // Use the context's createWallet method which handles everything including unlocking
      await createWallet({ name: walletName, mnemonic: seedPhrase });
      const storedWallet = createWalletEntry(walletName, undefined, selectedAvatar.id);
      await addWallet(storedWallet);
      await saveWalletMnemonic(storedWallet.id, seedPhrase);
      await setActiveWalletId(storedWallet.id);
      if (__DEV__) {
        console.info('[wallet-import] stored wallet', {
          id: storedWallet.id,
          name: storedWallet.name,
        });
      }
      const primaryAddress = await waitForPrimaryAddress(previousAddress);
      const addressMap = getAddressMap(addressesRef.current);
      // Persist addresses when they change, or when a new wallet has none yet.
      const addressesChanged =
        (primaryAddress && primaryAddress !== previousAddress) ||
        !areAddressMapsEqual(previousAddressMap, addressMap);
      const shouldPersistAddresses =
        (!!primaryAddress || !!addressMap) && !storedWallet.address && !storedWallet.addresses
          ? true
          : addressesChanged;
      if (shouldPersistAddresses && primaryAddress) {
        await updateWallet(storedWallet.id, {
          address: primaryAddress,
          addresses: addressMap,
        });
      } else if (shouldPersistAddresses && addressMap) {
        await updateWallet(storedWallet.id, { addresses: addressMap });
      } else if (__DEV__) {
        console.info('[wallet-import] address not updated (no change detected)');
      }
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
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Name Your Wallet</Text>
          <Text style={styles.subtitle}>This name is just for you and can be changed later.</Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Wallet Name*</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>{selectedAvatar.emoji}</Text>
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
