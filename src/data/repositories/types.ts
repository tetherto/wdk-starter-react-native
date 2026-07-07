import type { Account, TokenBalance, Transaction } from '@/domain/models';

/**
 * Repository contracts the UI depends on. Today these are backed by mock data;
 * the WDK integration will provide real implementations WITHOUT changing the UI.
 */
export interface WalletRepository {
  hasWallet(): Promise<boolean>;
  createWallet(): Promise<{ mnemonic: string[] }>;
  listAccounts(): Promise<Account[]>;
  getBalances(accountId: string): Promise<TokenBalance[]>;
  getTransactions(accountId: string): Promise<Transaction[]>;
}
