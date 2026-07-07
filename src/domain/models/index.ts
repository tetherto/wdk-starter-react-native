/** Framework-free domain types the UI consumes. WDK mappers will produce these later. */
export type ChainId = 'ethereum' | 'tron' | 'bitcoin';

export interface Token { id: string; symbol: string; chain: ChainId; gasless?: boolean; }
export interface TokenBalance { token: Token; amount: string; fiatValue: string; }
export interface Account { id: string; name: string; address: string; fiatTotal: string; }
export type TxDirection = 'in' | 'out';
export interface Transaction {
  id: string; direction: TxDirection; token: Token; amount: string; fiatValue: string;
  address: string; timestamp: number; status: 'pending' | 'confirmed' | 'failed';
}
