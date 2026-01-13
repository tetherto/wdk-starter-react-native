import {
  validateEvmAddress,
  validateSparkAddress,
  AddressValidator,
} from '@/utils/address-validators';
import { NetworkConfig } from '@tetherto/wdk-react-native-core';

export enum NetworkId {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  SPARK = 'spark',
  SPARK_REGTEST = 'spark_regtest',
  PLASMA = 'plasma',
  SEPOLIA = 'sepolia',
}

export type ProtocolFamily = 'evm' | 'spark';
export type AccountType = 'Safe' | 'Native';

export interface BaseChainConfig {
  id: NetworkId;
  name: string;
  family: ProtocolFamily;
  isTestnet: boolean;

  icon: any;
  color: string;
  gasLevel: 'High' | 'Normal' | 'Low';
  gasColor: string;
  explorerUrl?: string;

  supportedAccountTypes: AccountType[];
  addressValidator: AddressValidator;
}

export interface EvmChainConfig extends BaseChainConfig {
  family: 'evm';
  chainId: number;
  provider: string;

  bundlerUrl?: string;
  paymasterUrl?: string;
  paymasterAddress?: string;
  entryPointAddress?: string;
  safeModulesVersion?: string;
  paymasterToken?: { address: string };
  transferMaxFee?: number;

  userOpExplorerUrl?: string;
}

export interface SparkChainConfig extends BaseChainConfig {
  family: 'spark';
  network: 'MAINNET' | 'TESTNET' | 'REGTEST';
}

export type ChainConfig = EvmChainConfig | SparkChainConfig;

export const CHAINS: Record<NetworkId, ChainConfig> = {
  [NetworkId.ETHEREUM]: {
    id: NetworkId.ETHEREUM,
    name: 'Ethereum',
    family: 'evm',
    isTestnet: false,
    chainId: 1,
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    gasLevel: 'High',
    gasColor: '#FF3B30',
    explorerUrl: 'https://etherscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
    provider: 'https://eth.merkle.io',
    supportedAccountTypes: ['Safe', 'Native'],
    addressValidator: validateEvmAddress,
    bundlerUrl: 'https://api.candide.dev/public/v3/ethereum',
    paymasterUrl: 'https://api.candide.dev/public/v3/ethereum',
    paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    paymasterToken: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
    transferMaxFee: 100000,
  },
  [NetworkId.POLYGON]: {
    id: NetworkId.POLYGON,
    name: 'Polygon',
    family: 'evm',
    isTestnet: false,
    chainId: 137,
    icon: require('../../assets/images/chains/polygon-matic-logo.png'),
    color: '#8247E5',
    gasLevel: 'Low',
    gasColor: '#34C759',
    explorerUrl: 'https://polygonscan.com/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
    provider: 'https://polygon-rpc.com',
    supportedAccountTypes: ['Safe', 'Native'],
    addressValidator: validateEvmAddress,
    bundlerUrl: 'https://api.candide.dev/public/v3/polygon',
    paymasterUrl: 'https://api.candide.dev/public/v3/polygon',
    paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    paymasterToken: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
    transferMaxFee: 100000,
  },
  [NetworkId.ARBITRUM]: {
    id: NetworkId.ARBITRUM,
    name: 'Arbitrum',
    family: 'evm',
    isTestnet: false,
    chainId: 42161,
    icon: require('../../assets/images/chains/arbitrum-arb-logo.png'),
    color: '#28A0F0',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    explorerUrl: 'https://arbiscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
    provider: 'https://arb1.arbitrum.io/rpc',
    supportedAccountTypes: ['Safe', 'Native'],
    addressValidator: validateEvmAddress,
    bundlerUrl: 'https://api.candide.dev/public/v3/arbitrum',
    paymasterUrl: 'https://api.candide.dev/public/v3/arbitrum',
    paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    paymasterToken: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
    transferMaxFee: 100000,
  },
  [NetworkId.PLASMA]: {
    id: NetworkId.PLASMA,
    name: 'Plasma',
    family: 'evm',
    isTestnet: false,
    chainId: 9745,
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#00D4AA',
    gasLevel: 'Low',
    gasColor: '#34C759',
    explorerUrl: 'https://plasma.to/tx/',
    provider: 'https://rpc.plasma.to',
    supportedAccountTypes: ['Safe', 'Native'],
    addressValidator: validateEvmAddress,
    bundlerUrl: 'https://api.candide.dev/public/v3/9745',
    paymasterUrl: 'https://api.candide.dev/public/v3/9745',
    paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    transferMaxFee: 100000,
  },
  [NetworkId.SEPOLIA]: {
    id: NetworkId.SEPOLIA,
    name: 'Sepolia',
    family: 'evm',
    isTestnet: true,
    chainId: 11155111,
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    gasLevel: 'Low',
    gasColor: '#34C759',
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
    provider: 'https://sepolia.gateway.tenderly.co',
    supportedAccountTypes: ['Safe', 'Native'],
    addressValidator: validateEvmAddress,
    bundlerUrl: 'https://api.candide.dev/public/v3/sepolia',
    paymasterUrl: 'https://api.candide.dev/public/v3/sepolia',
    paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    paymasterToken: { address: '0xd077a400968890eacc75cdc901f0356c943e4fdb' },
    transferMaxFee: 500000,
  },
  [NetworkId.SPARK]: {
    id: NetworkId.SPARK,
    name: 'Spark',
    family: 'spark',
    isTestnet: false,
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
    gasLevel: 'Low',
    gasColor: '#34C759',
    explorerUrl: 'https://sparkscan.io/tx/',
    supportedAccountTypes: ['Native'],
    addressValidator: validateSparkAddress,
    network: 'MAINNET',
  },
  [NetworkId.SPARK_REGTEST]: {
    id: NetworkId.SPARK_REGTEST,
    name: 'Spark Regtest',
    family: 'spark',
    isTestnet: true,
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
    gasLevel: 'Low',
    gasColor: '#34C759',
    explorerUrl: 'https://sparkscan.io/tx/',
    supportedAccountTypes: ['Native'],
    addressValidator: validateSparkAddress,
    network: 'REGTEST',
  },
};

export const getAllChains = (): ChainConfig[] => Object.values(CHAINS);
export const getMainnets = (): ChainConfig[] => Object.values(CHAINS).filter((c) => !c.isTestnet);
export const getTestnets = (): ChainConfig[] => Object.values(CHAINS).filter((c) => c.isTestnet);
export const getChainsByFamily = (family: ProtocolFamily): ChainConfig[] =>
  Object.values(CHAINS).filter((c) => c.family === family);

export const isChainTestnet = (networkId: NetworkId): boolean => {
  return CHAINS[networkId].isTestnet;
};

export const getAddressType = (networkId: NetworkId) => {
  return CHAINS[networkId].supportedAccountTypes[0];
};

export const toNetworkConfig = (chain: ChainConfig): NetworkConfig => {
  if (chain.family === 'spark') {
    return {
      chainId: 999,
      blockchain: chain.id === NetworkId.SPARK ? 'MAINNET' : 'REGTEST',
    };
  }

  return {
    chainId: chain.chainId,
    blockchain: chain.id,
    provider: chain.provider,
    bundlerUrl: chain.bundlerUrl,
    paymasterUrl: chain.paymasterUrl,
    paymasterAddress: chain.paymasterAddress,
    entryPointAddress: chain.entryPointAddress,
    transferMaxFee: chain.transferMaxFee,
  };
};
