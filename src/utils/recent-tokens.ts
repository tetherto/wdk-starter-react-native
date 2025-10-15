import AsyncStorage from '@react-native-async-storage/async-storage';

type Operation = 'send' | 'receive';

const MAX_RECENT_TOKENS = 4;

const STORAGE_KEYS: Record<Operation, string> = {
  send: 'recent_tokens',
  receive: 'recent_receive_tokens',
};

/**
 * Save recent tokens to AsyncStorage for a specific operation
 */
const saveRecentTokens = async (tokens: string[], operation: Operation) => {
  try {
    const key = STORAGE_KEYS[operation];
    await AsyncStorage.setItem(key, JSON.stringify(tokens));
  } catch (error) {
    console.error(`Error saving recent ${operation} tokens:`, error);
  }
};

/**
 * Get recent tokens from AsyncStorage for a specific operation
 */
export const getRecentTokens = async (operation: Operation): Promise<string[]> => {
  try {
    const key = STORAGE_KEYS[operation];
    const tokens = await AsyncStorage.getItem(key);
    return tokens ? JSON.parse(tokens) : [];
  } catch (error) {
    console.error(`Error loading recent ${operation} tokens:`, error);
    return [];
  }
};

/**
 * Add a token to the recent tokens list for a specific operation
 * Moves the token to the front if it already exists, and maintains max limit
 */
export const addToRecentTokens = async (
  tokenName: string,
  operation: Operation
): Promise<string[]> => {
  try {
    const current = await getRecentTokens(operation);
    const filtered = current.filter(name => name !== tokenName);
    const updated = [tokenName, ...filtered].slice(0, MAX_RECENT_TOKENS);
    await saveRecentTokens(updated, operation);
    return updated;
  } catch (error) {
    console.error(`Error adding to recent ${operation} tokens:`, error);
    return [];
  }
};
