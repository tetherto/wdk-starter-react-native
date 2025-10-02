export enum AssetTicker {
  BTC = 'btc',
  USDT = 'usdt',
  XAUT = 'xaut',
}

export type TokenSymbol = AssetTicker;

export enum FiatCurrency {
  USD = 'USD',
}

export enum Denomination {
  BTC = 'btc',
  USDT = 'usdt',
  XAUT = 'xaut',
}

export enum NetworkType {
  SEGWIT = 'bitcoin',
  SPARK = 'spark',
  LIGHTNING = 'lightning',
  ETHEREUM = 'ethereum',
  SOLANA = 'solana',
  TRON = 'tron',
  TON = 'ton',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
}

export enum TransactionType {
  RECEIVED = 'received',
  SENT = 'sent',
  CASHOUT = 'cashout',
  BUY = 'buy',
  CONSOLIDATE = 'consolidate',
}

export enum TransactionStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  FAILED = 'failed',
}

/**
 * TODO: should be uncommented once all token address resolution is enabled
 */
export const AssetAddressMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin',
    // [NetworkType.SPARK]: 'spark',
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    // [NetworkType.POLYGON]: 'polygon',
    // [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
  },
  [AssetTicker.XAUT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    // [NetworkType.TON]: 'ton',
  },
};

export const AssetBalanceMap = {
  [AssetTicker.BTC]: {
    [NetworkType.SEGWIT]: 'bitcoin',
    [NetworkType.SPARK]: 'spark',
  },
  [AssetTicker.USDT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
  },
  [AssetTicker.XAUT]: {
    [NetworkType.ETHEREUM]: 'ethereum',
    [NetworkType.POLYGON]: 'polygon',
    [NetworkType.ARBITRUM]: 'arbitrum',
    [NetworkType.TON]: 'ton',
  },
};

export const AssetReceiveMap = {
  [AssetTicker.BTC]: [NetworkType.SEGWIT, NetworkType.SPARK, NetworkType.LIGHTNING],
  [AssetTicker.USDT]: [
    NetworkType.ETHEREUM,
    NetworkType.POLYGON,
    NetworkType.ARBITRUM,
    NetworkType.TON,
  ],
  [AssetTicker.XAUT]: [
    NetworkType.ETHEREUM,
    NetworkType.TON,
    NetworkType.POLYGON,
    NetworkType.ARBITRUM,
  ],
};

export const AssetSendMap = {
  [AssetTicker.BTC]: [NetworkType.SEGWIT, NetworkType.SPARK],
  [AssetTicker.USDT]: [NetworkType.ETHEREUM, NetworkType.SOLANA, NetworkType.TON, NetworkType.TRON],
  [AssetTicker.XAUT]: [NetworkType.ETHEREUM, NetworkType.TON],
};

export interface Icon {
  iconId: string;
}

export interface AssetInfo {
  name: string;
  ticker: AssetTicker;
  icon: Icon;
}

export interface AssetNetworkInfo {
  name: string;
  asset: AssetTicker;
  networkType: NetworkType;
  icon: Icon;
}

export interface AssetNetworkInfoWithAmount extends AssetNetworkInfo {
  amount: Amount;
}
export interface Amount {
  denomination: AssetTicker;
  value: string;
  networkType: NetworkType;
}
export interface FiatAmount extends Amount {
  fiatValue: string;
  currency: FiatCurrency;
}

export interface Asset {
  asset: AssetTicker;
  networkType: NetworkType;
  balance: Amount;
}

export interface GroupedAsset {
  asset: AssetTicker;
  balance: Amount;
}

export type GroupedBalanceByNetworkType = {
  [key in NetworkType]: {
    denomination: AssetTicker;
    value: number;
  };
};

export interface Wallet {
  id: string;
  name: string;
  enabledAssets: AssetTicker[];
}
export interface Jar {
  id: number;
  name: string;
  isPrivate: boolean;
  isEnabled: boolean;
}

export interface AccountData {
  addresses: Address[];
  balances: FiatAmount[];
  addressMap: Partial<Record<NetworkType, string>>;
  balanceMap: Partial<Record<NetworkType, number>>;
  transactions: Transaction[];
  transactionMap: Record<string, Transaction[]>;
}

export interface TransactionMetadata {
  blockNumber?: number;
  logIndex?: number;
  transactionIndex?: number;
  transferIndex?: number;
}

export enum Provider {
  MOONPAY = 'moonpay',
}

export interface Transaction {
  blockchain: string;
  blockNumber: number;
  transactionHash: string;
  transferIndex: number;
  token: string;
  amount: string;
  timestamp: number;
  transactionIndex: number;
  logIndex: number;
  from: string;
  to: string;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
}

export interface TransactionWithFiat extends Transaction {
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
}

export interface PendingTransaction {
  txId: string;
  externalTxId?: string;
  transactionReceiptId: string;
  hash: string;
  asset: AssetTicker;
  networkType: NetworkType;
  amount: number;
  fiatAmount?: number;
  fiatCurrency?: string;
  type: TransactionType;
  fee: number;
  ts: number;
  accountIndex?: number;
  to?: string;
  from?: string;
  provider?: Provider;
  isNotificationSent?: boolean;
}

export interface Address {
  asset?: AssetTicker;
  networkType: NetworkType;
  value: string;
}
export interface AssetWithFiat extends GroupedAsset {
  fiatValue: string;
}

export interface AssetWithFiatAndStats extends AssetWithFiat {
  percentChange: {
    oneDay: number;
  };
}

export interface WalletWithBalance extends Wallet {
  assets: GroupedAsset[];
  assetsWithFiat: AssetWithFiat[];
  balancesWithFiat: FiatAmount[];
  totalFiatBalance: string;
  fiatCurrency: FiatCurrency;
}

export interface WalletWithBalanceAndStats extends WalletWithBalance {
  assetsWithFiatAndStats: AssetWithFiatAndStats[];
}
export interface WalletWithBalanceAndJars extends WalletWithBalance {
  jars: Jar[];
}

export enum SuggestionType {
  REDIRECT = 'redirect',
  REVEAL_SEED = 'reveal_seed',
}

export interface Suggestion {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  visible: boolean;
  type: SuggestionType;
}

export interface News {
  id: string;
  date: string;
  title: string;
  description: string;
  link: string;
  seen: boolean;
}

export interface SecurityAlert {
  id: string;
  dateAndTime: string;
  title: string;
  ip: string;
  source: string;
  seen: boolean;
}

export interface JarWithBalance extends Jar {
  totalFiatBalance: {
    value: string;
    fiatCurrency: FiatCurrency;
  };
}

export interface InitializeAccountParams {
  walletId: string;
  accountIndex: number;
}

export interface InitializeAccountWithBalancesLazyParams {
  walletId: string;
  accountIndex: number;
  addresses: Partial<Record<NetworkType, string>>;
  balances: Record<
    string,
    {
      balance: number;
      asset: AssetTicker;
    }
  >;
}

export interface RefreshAccountBalanceParams {
  walletId: string;
  accountIndex: number;
}

export interface GetTransactionReceiptParams {
  walletId: string;
  networkType: NetworkType;
  accountIndex: number;
  hash: string;
}
export interface TransactionReceipt {
  blockHash: string;
  blockNumber: number;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  from: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  index: number;
  logs: Log[];
  logsBloom: string;
  status: number;
  to: string;
}

interface Log {
  address: string;
  blockHash: string;
  blockNumber: number;
  data: string;
  index: number;
  topics: string[];
  transactionHash: string;
  transactionIndex: number;
}
