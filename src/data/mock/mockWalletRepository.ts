import type { WalletRepository } from '../repositories/types';
import type { Token, TokenBalance, Account, Transaction } from '@/domain/models';

const usdtTron: Token = { id: 'usdt-tron', symbol: 'USDT', chain: 'tron', gasless: true };
const eth: Token = { id: 'eth', symbol: 'ETH', chain: 'ethereum' };
const btc: Token = { id: 'btc', symbol: 'BTC', chain: 'bitcoin' };

const balances: TokenBalance[] = [
  { token: usdtTron, amount: '1,500.00', fiatValue: '$1,500.00' },
  { token: eth, amount: '0.1234', fiatValue: '$432.18' },
  { token: btc, amount: '0.0015', fiatValue: '$65.14' },
];
const accounts: Account[] = [
  { id: '1', name: 'Account 1', address: '0x330f...9aFE1', fiatTotal: '$1,997.32' },
];
const transactions: Transaction[] = [
  { id: 'tx1', direction: 'in', token: usdtTron, amount: '100.00', fiatValue: '$100.00', address: 'TXfm9Ev2k8', timestamp: Date.now(), status: 'confirmed' },
];

/** Mock repository so the UI is fully developable before WDK exists. */
export const mockWalletRepository: WalletRepository = {
  hasWallet: async () => false,
  createWallet: async () => ({ mnemonic: ['abandon','ability','able','about','above','absent','absorb','abstract','absurd','abuse','access','accident'] }),
  listAccounts: async () => accounts,
  getBalances: async () => balances,
  getTransactions: async () => transactions,
};
