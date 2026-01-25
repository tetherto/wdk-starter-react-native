import * as Keychain from 'react-native-keychain';
import { nanoid } from 'nanoid/non-secure';

export type StoredWallet = {
  id: string;
  name: string;
  address?: string;
  addresses?: Record<string, string>;
  avatarId?: number;
  createdAt: number;
  lastUsedAt: number;
};

const STORAGE_SERVICE_WALLET_META = 'wdk_wallets_meta';
const STORAGE_SERVICE_ACTIVE_WALLET_ID = 'wdk_active_wallet_id';

const storeWalletValue = async (service: string, value: string) => {
  try {
    await Keychain.setGenericPassword('wallets', value, {
      service,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  } catch (error) {
    console.error('Error saving secure value:', error);
  }
};

const readWalletValue = async (service: string): Promise<string | null> => {
  try {
    const result = await Keychain.getGenericPassword({ service });
    return result ? result.password : null;
  } catch (error) {
    console.error('Error loading secure value:', error);
    return null;
  }
};

const saveWallets = async (wallets: StoredWallet[]) => {
  await storeWalletValue(STORAGE_SERVICE_WALLET_META, JSON.stringify(wallets));
};

export const getWallets = async (): Promise<StoredWallet[]> => {
  try {
    const stored = await readWalletValue(STORAGE_SERVICE_WALLET_META);
    const parsed = stored ? JSON.parse(stored) : [];
    if (__DEV__) {
      console.info('[wallet-storage] getWallets', {
        count: Array.isArray(parsed) ? parsed.length : 0,
        raw: stored,
      });
    }
    return parsed;
  } catch (error) {
    console.error('Error loading wallets:', error);
    return [];
  }
};

export const setActiveWalletId = async (walletId: string) => {
  if (!walletId) {
    await Keychain.resetGenericPassword({ service: STORAGE_SERVICE_ACTIVE_WALLET_ID });
    return;
  }
  await storeWalletValue(STORAGE_SERVICE_ACTIVE_WALLET_ID, walletId);
};

export const getActiveWalletId = async (): Promise<string | null> => {
  return readWalletValue(STORAGE_SERVICE_ACTIVE_WALLET_ID);
};

export const createWalletEntry = (
  name: string,
  address?: string,
  avatarId?: number
): StoredWallet => {
  const now = Date.now();
  const id = nanoid();
  return {
    id,
    name,
    address,
    avatarId,
    createdAt: now,
    lastUsedAt: now,
  };
};

export const addWallet = async (wallet: StoredWallet): Promise<StoredWallet[]> => {
  const wallets = await getWallets();
  const updated = [wallet, ...wallets.filter((item) => item.id !== wallet.id)];
  await saveWallets(updated);
  if (__DEV__) {
    console.info('[wallet-storage] addWallet', {
      addedId: wallet.id,
      total: updated.length,
    });
  }
  return updated;
};

export const updateWallet = async (
  walletId: string,
  updates: Partial<Omit<StoredWallet, 'id' | 'createdAt'>>
): Promise<StoredWallet[]> => {
  const wallets = await getWallets();
  const updated = wallets.map((wallet) =>
    wallet.id === walletId ? { ...wallet, ...updates } : wallet
  );
  await saveWallets(updated);
  return updated;
};

export const touchWallet = async (walletId: string): Promise<StoredWallet[]> => {
  return updateWallet(walletId, { lastUsedAt: Date.now() });
};

export const removeWallet = async (walletId: string): Promise<StoredWallet[]> => {
  const wallets = await getWallets();
  const updated = wallets.filter((wallet) => wallet.id !== walletId);
  await saveWallets(updated);
  if (__DEV__) {
    console.info('[wallet-storage] removeWallet', {
      removedId: walletId,
      total: updated.length,
    });
  }
  return updated;
};

export const clearWallets = async () => {
  await Keychain.resetGenericPassword({ service: STORAGE_SERVICE_WALLET_META });
  await Keychain.resetGenericPassword({ service: STORAGE_SERVICE_ACTIVE_WALLET_ID });
};
