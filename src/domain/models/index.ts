/** Framework-free domain types the UI consumes. WDK mappers will produce these later. */
export type ChainId = 'ethereum' | 'arbitrum' | 'polygon' | 'sepolia' | 'tron' | 'bitcoin';

export interface Token { id: string; symbol: string; chain: ChainId; gasless?: boolean; }
export interface TokenBalance {
  token: Token; amount: string; fiatValue: string;
  /** True when THIS asset's own balance fetch failed (e.g. an RPC
   * timeout) — distinct from a genuinely zero balance. Without this,
   * a failed fetch and an empty wallet look identical ("0"), which is
   * actively misleading: a real, confirmed bug where a timeout error was
   * silently displayed as a $0 balance instead of a visible failure. */
  fetchFailed?: boolean;
}
export interface Account { id: string; name: string; address: string; fiatTotal: string; }
export type TxDirection = 'in' | 'out';
export interface Transaction {
  id: string; direction: TxDirection; token: Token; amount: string; fiatValue: string;
  address: string; timestamp: number; status: 'pending' | 'confirmed' | 'failed';
  /** From the indexer's real transfer data — used as an honest technical
   * detail on the transaction detail screen (the prototype shows a
   * blockchain "Nonce" there, which this app has no data source for; block
   * number is real data we do have, shown instead of fabricating a nonce
   * value). */
  blockNumber?: number;
}
