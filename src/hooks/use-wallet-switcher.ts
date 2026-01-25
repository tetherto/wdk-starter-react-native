import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { Alert } from 'react-native';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import {
  deleteWalletMnemonic,
  getWalletMnemonic,
  resetWalletMnemonics,
} from '../utils/wallet-secrets';
import {
  clearWallets,
  getActiveWalletId,
  getWallets,
  removeWallet,
  setActiveWalletId,
  touchWallet,
  updateWallet,
} from '../utils/wallet-storage';
import { clearWalletCache } from '@/utils/wallet-cache';

/**
 * Wallet Switcher Hook
 *
 * Responsibilities:
 * - Control wallet switcher sheet visibility
 * - Switch active wallet via WDK (single source of truth)
 *
 * Invariants:
 * - No wallet state duplication
 * - WDK remains authoritative for active wallet
 */
type WalletInfo = {
  id: string;
  name: string;
  address?: string;
  addresses?: Record<string, string>;
  avatarId?: number;
};

type WalletSwitcherContextValue = {
  isOpen: boolean;
  wallets: WalletInfo[];
  activeWallet?: WalletInfo;
  isSwitchingWallet: boolean;
  open: () => void;
  close: () => void;
  switchWallet: (walletId: string) => Promise<void>;
  deleteWallet: (walletId: string) => Promise<void>;
  resetWallets: () => Promise<void>;
};

const WalletSwitcherContext = React.createContext<WalletSwitcherContextValue | undefined>(
  undefined
);

export function WalletSwitcherProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [activeWalletId, setActiveWalletIdLocal] = useState<string | null>(null);
  const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);
  const { createWallet, clearWallet, addresses, wallet } = useWallet();
  const router = useDebouncedNavigation();
  const addressesRef = useRef(addresses);
  const lastPrimaryAddressRef = useRef<string | undefined>(undefined);

  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    addressesRef.current = addresses;
  }, [addresses]);

  const getPrimaryAddress = useCallback((value?: typeof addresses) => {
    if (!value) return undefined;
    const candidate = Object.values(value).find(Boolean);
    return typeof candidate === 'string' ? candidate : undefined;
  }, []);

  const getAddressMap = useCallback((value?: typeof addresses) => {
    if (!value) return undefined;
    const entries = Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1]
    );
    return entries.length ? Object.fromEntries(entries) : undefined;
  }, []);

  const areAddressMapsEqual = useCallback(
    (left?: Record<string, string>, right?: Record<string, string>) => {
      if (!left && !right) return true;
      if (!left || !right) return false;
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      if (leftKeys.length !== rightKeys.length) return false;
      return leftKeys.every((key) => left[key] === right[key]);
    },
    []
  );

  const waitForPrimaryAddress = useCallback(
    async (previous?: string) => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const next = getPrimaryAddress(addressesRef.current);
        if (next && next !== previous) {
          return next;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      return getPrimaryAddress(addressesRef.current);
    },
    [getPrimaryAddress]
  );

  const runWithSwitchingState = useCallback(async (action: () => Promise<void>) => {
    setIsSwitchingWallet(true);
    try {
      await action();
    } finally {
      setIsSwitchingWallet(false);
    }
  }, []);

  const resetWallets = useCallback(async () => {
    const walletIds = wallets.map((wallet) => wallet.id);
    await resetWalletMnemonics(walletIds);
    await clearWallets();
    await clearWallet();
    setWallets([]);
    setActiveWalletIdLocal(null);
    router.replace('/onboarding');
  }, [clearWallet, router, wallets]);

  const handleBiometryNotEnrolled = useCallback(() => {
    Alert.alert(
      'Biometrics Not Enrolled',
      'This wallet was saved with biometric-only protection. To continue on this device, reset secure storage and re-import your wallets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Wallets',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetWallets();
            } catch (error) {
              console.error('[wallet-switcher] failed to reset wallets', error);
            }
          },
        },
      ]
    );
  }, [resetWallets]);

  const loadWalletById = useCallback(
    async (walletId: string, options?: { closeOnFinish?: boolean }) => {
      const closeOnFinish = options?.closeOnFinish ?? true;
      if (!walletId || walletId === activeWalletId) {
        if (closeOnFinish) close();
        return;
      }

      const wallet = wallets.find((item) => item.id === walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      let mnemonic: string;
      try {
        mnemonic = await getWalletMnemonic(walletId);
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('no fingerprints enrolled')) {
          await handleBiometryNotEnrolled();
          return;
        }
        throw error;
      }
      const previousAddress = getPrimaryAddress(addressesRef.current);
      const previousAddressMap = getAddressMap(addressesRef.current);
      await clearWalletCache();
      const createdWallet = await createWallet({ name: wallet.name, mnemonic });
      await setActiveWalletId(walletId);
      setActiveWalletIdLocal(walletId);
      await touchWallet(walletId);
      setWallets((prev) =>
        prev.map((item) =>
          item.id === walletId
            ? {
                ...item,
                name: createdWallet?.name || item.name,
              }
            : item
        )
      );
      const updateAddressesAsync = async () => {
        const nextAddress = await waitForPrimaryAddress(previousAddress);
        const addressMap = getAddressMap(addressesRef.current);
        // Only persist addresses when they change to prevent writing stale data.
        const addressesChanged =
          (nextAddress && nextAddress !== previousAddress) ||
          !areAddressMapsEqual(previousAddressMap, addressMap);
        if (!addressesChanged || (!nextAddress && !addressMap)) {
          return;
        }

        const storedActiveId = await getActiveWalletId();
        if (storedActiveId !== walletId) {
          return;
        }

        await updateWallet(walletId, { address: nextAddress, addresses: addressMap }).catch(
          (error) => {
            console.error('[wallet-switcher] failed to update address after switch', error);
          }
        );

        setWallets((prev) =>
          prev.map((item) =>
            item.id === walletId
              ? {
                  ...item,
                  address: nextAddress || item.address,
                  addresses: addressMap ?? item.addresses,
                }
              : item
          )
        );
      };

      updateAddressesAsync().catch((error) => {
        console.error('[wallet-switcher] address update failed', error);
      });
      if (closeOnFinish) close();
    },
    [
      activeWalletId,
      close,
      createWallet,
      getAddressMap,
      getPrimaryAddress,
      handleBiometryNotEnrolled,
      wallets,
      waitForPrimaryAddress,
    ]
  );

  const switchWallet = useCallback(
    async (walletId: string) => {
      const previousActiveId = activeWalletId;
      await runWithSwitchingState(async () => {
        // Optimistically update selection for instant UI feedback.
        if (walletId && walletId !== activeWalletId) {
          setActiveWalletIdLocal(walletId);
        }
        close();
        try {
          await loadWalletById(walletId, { closeOnFinish: false });
        } catch (error) {
          if (previousActiveId) {
            setActiveWalletIdLocal(previousActiveId);
          }
          throw error;
        }
      });
    },
    [activeWalletId, close, loadWalletById, runWithSwitchingState]
  );

  const deleteWallet = useCallback(
    async (walletId: string) => {
      const previousWallets = wallets;
      const previousActiveId = activeWalletId;
      await runWithSwitchingState(async () => {
        const remaining = wallets.filter((wallet) => wallet.id !== walletId);
        const nextActiveId = remaining[0]?.id || null;
        // Optimistically remove from UI to avoid lag.
        setWallets(remaining);
        if (walletId === activeWalletId) {
          setActiveWalletIdLocal(nextActiveId);
        }

        try {
          if (walletId === activeWalletId) {
            if (remaining.length > 0) {
              await loadWalletById(remaining[0].id, { closeOnFinish: false });
            } else {
              await clearWallet();
              await setActiveWalletId('');
              setActiveWalletIdLocal(null);
            }
          }

          await deleteWalletMnemonic(walletId);
          const updated = await removeWallet(walletId);
          setWallets(updated);
        } catch (error) {
          // Restore previous state on failure.
          setWallets(previousWallets);
          if (previousActiveId) {
            setActiveWalletIdLocal(previousActiveId);
          }
          throw error;
        }
      });
    },
    [activeWalletId, clearWallet, loadWalletById, runWithSwitchingState, wallets]
  );

  const loadWallets = useCallback(async () => {
    let storedWallets = await getWallets();
    if (!storedWallets.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      storedWallets = await getWallets();
    }
    const storedActiveId = await getActiveWalletId();
    const sortedWallets = [...storedWallets].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    const hasStoredActive = sortedWallets.some((wallet) => wallet.id === storedActiveId);
    const nextActiveId = hasStoredActive ? storedActiveId : sortedWallets[0]?.id || null;
    setWallets(sortedWallets);
    setActiveWalletIdLocal(nextActiveId);
    if (!sortedWallets.length) {
      await setActiveWalletId('');
      router.replace('/onboarding');
    }
    if (__DEV__) {
      console.info('[wallet-switcher] loaded wallets', {
        count: sortedWallets.length,
        activeId: nextActiveId,
        ids: sortedWallets.map((wallet) => wallet.id),
      });
    }
  }, [router]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    if (wallet) {
      loadWallets();
    }
  }, [wallet, loadWallets]);

  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen, loadWallets]);

  const primaryAddress = useMemo(() => getPrimaryAddress(addresses), [addresses, getPrimaryAddress]);

  useEffect(() => {
    if (!activeWalletId || !primaryAddress) return;
    let cancelled = false;
    const syncAddress = async () => {
      const storedActiveId = await getActiveWalletId();
      if (cancelled) return;
      if (!storedActiveId || storedActiveId !== activeWalletId) {
        return;
      }
      if (primaryAddress === lastPrimaryAddressRef.current) return;
      const currentWallet = wallets.find((wallet) => wallet.id === activeWalletId);
      if (
        wallet?.name &&
        currentWallet?.name &&
        wallet.name !== currentWallet.name &&
        (currentWallet.address || currentWallet.addresses)
      ) {
        // Addresses belong to a different active wallet; skip sync to avoid overwriting.
        return;
      }
      if (currentWallet?.address === primaryAddress) {
        lastPrimaryAddressRef.current = primaryAddress;
        return;
      }
      const addressMap = getAddressMap(addresses);
      // Only persist addresses when they change to prevent writing stale data.
      const addressesChanged =
        (primaryAddress && primaryAddress !== currentWallet?.address) ||
        !areAddressMapsEqual(currentWallet?.addresses, addressMap);
      if (!addressesChanged) {
        return;
      }

      updateWallet(activeWalletId, { address: primaryAddress, addresses: addressMap }).catch(
        (error) => {
          console.error('[wallet-switcher] failed to update address', error);
        }
      );

      setWallets((prev) =>
        prev.map((wallet) =>
          wallet.id === activeWalletId
            ? { ...wallet, address: primaryAddress, addresses: addressMap ?? wallet.addresses }
            : wallet
        )
      );
      lastPrimaryAddressRef.current = primaryAddress;
    };
    syncAddress();
    return () => {
      cancelled = true;
    };
  }, [activeWalletId, addresses, getAddressMap, primaryAddress, wallets]);

  const activeWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === activeWalletId),
    [wallets, activeWalletId]
  );

  const value = useMemo(
    () => ({
      isOpen,
      wallets,
      activeWallet,
      isSwitchingWallet,
      open,
      close,
      switchWallet,
      deleteWallet,
      resetWallets,
    }),
    [
      isOpen,
      wallets,
      activeWallet,
      isSwitchingWallet,
      open,
      close,
      switchWallet,
      deleteWallet,
      resetWallets,
    ]
  );

  return React.createElement(WalletSwitcherContext.Provider, { value }, children);
}

export function useWalletSwitcher() {
  const context = useContext(WalletSwitcherContext);
  if (!context) {
    throw new Error('useWalletSwitcher must be used within WalletSwitcherProvider');
  }
  return context;
}
