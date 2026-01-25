import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_ADDRESSES = 'wdk_wallet_addresses';
const STORAGE_KEY_BALANCES = 'wdk_wallet_balances';
const STORAGE_KEY_TRANSACTIONS = 'wdk_wallet_transactions';

export const clearWalletCache = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEY_ADDRESSES,
    STORAGE_KEY_BALANCES,
    STORAGE_KEY_TRANSACTIONS,
  ]);
};
