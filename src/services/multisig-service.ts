import AsyncStorage from '@react-native-async-storage/async-storage';
import { MultisigNetworkType } from '@/config/multisig-config';

const MULTISIG_STORAGE_KEY = 'multisig_safes';

export interface StoredSafe {
  address: string;
  network: MultisigNetworkType;
  name: string;
  owners: string[];
  threshold: number;
  createdAt: number;
}

export interface SafeInfo {
  address: string;
  owners: string[];
  threshold: number;
  nonce: bigint;
  version: string;
  isDeployed: boolean;
}

export interface PendingTransaction {
  safeOperationHash: string;
  to: string;
  value: string;
  data: string;
  confirmations: number;
  threshold: number;
  proposedBy: string;
  proposedAt: number;
}

class MultisigService {
  private static instance: MultisigService;

  static getInstance(): MultisigService {
    if (!MultisigService.instance) {
      MultisigService.instance = new MultisigService();
    }
    return MultisigService.instance;
  }

  async getSafes(): Promise<StoredSafe[]> {
    try {
      const data = await AsyncStorage.getItem(MULTISIG_STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get safes:', error);
      return [];
    }
  }

  async getSafesByNetwork(network: MultisigNetworkType): Promise<StoredSafe[]> {
    const safes = await this.getSafes();
    return safes.filter((safe) => safe.network === network);
  }

  async addSafe(safe: StoredSafe): Promise<void> {
    try {
      const safes = await this.getSafes();
      const exists = safes.some(
        (s) => s.address.toLowerCase() === safe.address.toLowerCase() && s.network === safe.network
      );
      if (exists) {
        throw new Error('Safe already exists');
      }
      safes.push(safe);
      await AsyncStorage.setItem(MULTISIG_STORAGE_KEY, JSON.stringify(safes));
    } catch (error) {
      console.error('Failed to add safe:', error);
      throw error;
    }
  }

  async updateSafe(address: string, network: MultisigNetworkType, updates: Partial<StoredSafe>): Promise<void> {
    try {
      const safes = await this.getSafes();
      const index = safes.findIndex(
        (s) => s.address.toLowerCase() === address.toLowerCase() && s.network === network
      );
      if (index === -1) {
        throw new Error('Safe not found');
      }
      safes[index] = { ...safes[index], ...updates };
      await AsyncStorage.setItem(MULTISIG_STORAGE_KEY, JSON.stringify(safes));
    } catch (error) {
      console.error('Failed to update safe:', error);
      throw error;
    }
  }

  async removeSafe(address: string, network: MultisigNetworkType): Promise<void> {
    try {
      const safes = await this.getSafes();
      const filtered = safes.filter(
        (s) => !(s.address.toLowerCase() === address.toLowerCase() && s.network === network)
      );
      await AsyncStorage.setItem(MULTISIG_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove safe:', error);
      throw error;
    }
  }

  async getSafe(address: string, network: MultisigNetworkType): Promise<StoredSafe | null> {
    const safes = await this.getSafes();
    return (
      safes.find(
        (s) => s.address.toLowerCase() === address.toLowerCase() && s.network === network
      ) || null
    );
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(MULTISIG_STORAGE_KEY);
  }
}

export const multisigService = MultisigService.getInstance();
