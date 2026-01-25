import { CommonActions, useNavigation } from '@react-navigation/native';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { ensureDeviceAuthentication } from '@/utils/ensure-device-auth';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import getErrorMessage from '@/utils/get-error-message';
import { clearWalletCache } from '@/utils/wallet-cache';
import {
  addWallet,
  createWalletEntry,
  setActiveWalletId,
  updateWallet,
} from '@/utils/wallet-storage';
import { saveWalletMnemonic } from '@/utils/wallet-secrets';

export default function CompleteScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    walletName: string;
    mnemonic: string;
    avatarId?: string;
  }>();
  const { createWallet, isLoading, addresses } = useWallet();
  const [walletCreated, setWalletCreated] = useState(false);
  const addressesRef = useRef(addresses);

  useEffect(() => {
    addressesRef.current = addresses;
  }, [addresses]);

  useEffect(() => {
    // Auto-create wallet when screen loads
    createWalletWithWDK();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const createWalletWithWDK = async () => {
    if (walletCreated) return;

    try {
      const walletNameValue = Array.isArray(params.walletName)
        ? params.walletName[0]
        : params.walletName;
      const mnemonicValue = Array.isArray(params.mnemonic) ? params.mnemonic[0] : params.mnemonic;
      const walletName = walletNameValue || 'My Wallet';
      const mnemonic = mnemonicValue?.split(',').join(' ');

      if (!mnemonic) {
        throw new Error('Missing seed phrase for wallet creation');
      }

      await ensureDeviceAuthentication();

      const previousAddress = getPrimaryAddress(addressesRef.current);
      const previousAddressMap = getAddressMap(addressesRef.current);
      await clearWalletCache();
      // Use the wallet context to create the wallet
      await createWallet({
        name: walletName,
        mnemonic,
      });

      const avatarIdValue = Array.isArray(params.avatarId) ? params.avatarId[0] : params.avatarId;
      const avatarId = avatarIdValue ? Number(avatarIdValue) : undefined;
      const storedWallet = createWalletEntry(walletName, undefined, avatarId);
      await addWallet(storedWallet);
      await saveWalletMnemonic(storedWallet.id, mnemonic);
      await setActiveWalletId(storedWallet.id);
      if (__DEV__) {
        console.info('[wallet-create] stored wallet', {
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
        console.info('[wallet-create] address not updated (no change detected)');
      }
      setWalletCreated(true);
    } catch (error) {
      console.error('Failed to create wallet:', error);
      const message = getErrorMessage(
        error,
        'There was an issue creating your wallet. Please try again.'
      );
      Alert.alert('Wallet Creation Failed', message, [
        { text: 'Retry', onPress: () => createWalletWithWDK() },
      ]);
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
