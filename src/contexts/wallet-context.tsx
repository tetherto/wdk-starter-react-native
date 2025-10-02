import { initializeWalletWithSeed } from '@/services/wallet-setup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { getUniqueId } from 'react-native-device-info';
import { WDKService } from '../services/wdk-service';
import type { AccountData, NetworkType, Transaction, Wallet } from '../services/wdk-service/types';

// Types
interface WalletMetadata {
  id: string;
  name: string;
  icon: string;
}

interface WalletWithAccountData extends Wallet {
  accountData?: AccountData;
  balance?: string;
  fiatBalance?: string;
  icon?: string;
  transactions?: Transaction[];
}

interface WalletContextState {
  wallet: WalletWithAccountData | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  isUnlocked: boolean;
}

type WalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_WALLET'; payload: WalletWithAccountData | null }
  | { type: 'UPDATE_WALLET'; payload: Partial<WalletWithAccountData> }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_UNLOCKED'; payload: boolean }
  | { type: 'CLEAR_WALLET' };

interface WalletContextType extends WalletContextState {
  // Actions
  setWallet: (wallet: WalletWithAccountData | null) => void;
  updateWallet: (updates: Partial<WalletWithAccountData>) => void;
  clearWallet: () => void;

  // Async operations
  initializeWDK: () => Promise<void>;
  loadWallet: () => Promise<void>;
  createWallet: (params: {
    name: string;
    type: 'primary' | 'imported';
    network: string;
    icon?: string;
    mnemonic?: string;
  }) => Promise<WalletWithAccountData>;
  importWallet: (mnemonic: string, name: string) => Promise<WalletWithAccountData>;
  refreshWalletBalance: () => Promise<void>;
  unlockWallet: () => Promise<boolean | undefined>;
}

const STORAGE_KEY = 'wdk_wallet_metadata';

// Initial state
const initialState: WalletContextState = {
  wallet: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  isUnlocked: false,
};

// Reducer
function walletReducer(state: WalletContextState, action: WalletAction): WalletContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_WALLET':
      return {
        ...state,
        wallet: action.payload,
      };

    case 'UPDATE_WALLET':
      return {
        ...state,
        wallet: state.wallet ? { ...state.wallet, ...action.payload } : null,
      };

    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };

    case 'SET_UNLOCKED':
      return { ...state, isUnlocked: action.payload };

    case 'CLEAR_WALLET':
      return { ...state, wallet: null, isUnlocked: false };

    default:
      return state;
  }
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Load wallet from storage on mount
  useEffect(() => {
    loadStoredWallet();
  }, []);

  // Save wallet to storage whenever wallet changes
  useEffect(() => {
    if (state.isInitialized && state.wallet) {
      saveWalletToStorage();
    }
  }, [state.wallet, state.isInitialized]);

  // Storage operations
  const loadStoredWallet = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        let metadata: WalletMetadata = data;

        // Create minimal wallet object - full data will be loaded during unlock/init
        const minimalWallet: WalletWithAccountData = {
          id: metadata.id,
          name: metadata.name,
          icon: metadata.icon,
          enabledAssets: [],
        };

        dispatch({ type: 'SET_WALLET', payload: minimalWallet });
      }
    } catch (error) {
      console.error('Failed to load stored wallet:', error);
    } finally {
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
  };

  const saveWalletToStorage = async () => {
    try {
      if (state.wallet) {
        // Only save minimal metadata - name and icon
        // Seed phrase is stored securely by WDK, other data is fetched on init
        const metadata: WalletMetadata = {
          id: state.wallet.id,
          name: state.wallet.name,
          icon: state.wallet.icon || '💎',
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('Failed to save wallet to storage:', error);
    }
  };

  // Actions
  const setWallet = (wallet: WalletWithAccountData | null) => {
    dispatch({ type: 'SET_WALLET', payload: wallet });
  };

  const updateWallet = (updates: Partial<WalletWithAccountData>) => {
    dispatch({ type: 'UPDATE_WALLET', payload: updates });
  };

  const clearWallet = () => {
    dispatch({ type: 'CLEAR_WALLET' });
  };

  // Async operations
  const initializeWDK = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await WDKService.initialize();
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize WDK';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadWallet = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const wdkWallets = await WDKService.getWallets();

      console.log('loadWallet wdkWallets', wdkWallets);

      if (wdkWallets.length > 0) {
        const wdkWallet = wdkWallets[0]; // Take first wallet
        const accountData = await WDKService.initializeAccountWithBalances({
          walletId: wdkWallet.id,
          accountIndex: 0,
        });

        const wallet: WalletWithAccountData = {
          id: wdkWallet.id,
          name: wdkWallet.name,
          enabledAssets: wdkWallet.enabledAssets,
          accountData,
          icon: state.wallet?.icon || '💎', // Preserve icon from metadata
        };

        dispatch({ type: 'SET_WALLET', payload: wallet });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createWallet = async (params: {
    name: string;
    type: 'primary' | 'imported';
    network: string;
    icon?: string;
    mnemonic?: string;
  }): Promise<WalletWithAccountData> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      await initializeWDK();

      const prf = await getUniqueId();

      if (params.mnemonic) {
        await WDKService.importSeedPhrase({ prf, seedPhrase: params.mnemonic });
      } else {
        await WDKService.createSeed({ prf });
      }

      const wdkWallet = await WDKService.createWallet({
        walletName: params.name,
        prf,
      });

      const accountData = await WDKService.initializeAccountWithBalances({
        walletId: wdkWallet.id,
        accountIndex: 0,
      });

      const wallet: WalletWithAccountData = {
        id: wdkWallet.id,
        name: wdkWallet.name,
        enabledAssets: wdkWallet.enabledAssets,
        accountData,
        icon: params.icon || '💎', // Use provided icon or default
      };

      dispatch({ type: 'SET_WALLET', payload: wallet });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Mark wallet as unlocked since we just created and initialized it
      dispatch({ type: 'SET_UNLOCKED', payload: true });

      return wallet;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create wallet';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const importWallet = async (
    mnemonic: string,
    name: string,
    icon?: string
  ): Promise<WalletWithAccountData> => {
    return createWallet({
      name,
      type: 'imported',
      network: 'ethereum',
      icon,
      mnemonic,
    });
  };

  const unlockWallet = async () => {
    if (!state.wallet) {
      throw new Error('No wallet found');
    }

    // Get device ID for seed retrieval
    const prf = await getUniqueId();

    // Retrieve the seed phrase
    const seed = await WDKService.retrieveSeed(prf);

    if (!seed) {
      throw new Error('Failed to retrieve seed phrase');
    }

    // Initialize the wallet with the seed
    const result = await initializeWalletWithSeed(seed, state.wallet.name, prf);

    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize wallet');
    }

    const enrichedWallet: WalletWithAccountData = {
      ...state.wallet,
      id: result.wallet.id || '',
      name: result.wallet.name || '',
      enabledAssets: result.wallet.enabledAssets || [],
      accountData: result.wallet.account,
    };

    dispatch({ type: 'SET_WALLET', payload: enrichedWallet });
    dispatch({ type: 'SET_UNLOCKED', payload: true });

    return true;
  };

  const refreshWalletBalance = async () => {
    try {
      if (!state.wallet || !state.wallet.accountData) {
        console.error('Wallet or account data not found');
        return;
      }

      const balanceMap = await WDKService.resolveWalletBalances(
        state.wallet.enabledAssets,
        state.wallet.accountData.addressMap
      );

      const balances = Object.entries(balanceMap).map(
        ([key, { balance, asset, fiatValue, fiatCurrency }]) => {
          const [networkType] = key.split('_') as [NetworkType];
          return {
            networkType,
            denomination: asset,
            value: balance.toString(),
            fiatValue: fiatValue.toString(),
            currency: fiatCurrency,
          };
        }
      );

      const transactionMap = await WDKService.resolveWalletTransactions(
        state.wallet.enabledAssets,
        state.wallet.accountData.addressMap
      );

      const transactions: Transaction[] = Object.entries(transactionMap).reduce(
        (allTransactions, [key, txArray]) => {
          return allTransactions.concat(txArray);
        },
        [] as Transaction[]
      );

      updateWallet({
        accountData: {
          ...state.wallet.accountData,
          balances,
          balanceMap,
          transactions: transactions,
          transactionMap,
        },
      });
    } catch (error) {
      console.error('Failed to refresh wallet balance:', error);
    }
  };

  const value: WalletContextType = {
    ...state,
    setWallet,
    updateWallet,
    clearWallet,
    initializeWDK,
    loadWallet,
    createWallet,
    importWallet,
    refreshWalletBalance,
    unlockWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// Custom hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export default WalletContext;
