import { NetworkMode } from '@/services/network-mode-service';
import { NetworkType } from './networks';

export type MultisigNetworkType = Exclude<NetworkType, 'spark'>;

export interface MultisigNetworkConfig {
  chainId: bigint;
  provider: string;
  bundlerUrl: string;
  paymasterUrl: string;
  paymasterAddress?: string;
  paymasterTokenAddress: string;
  entryPointAddress: string;
  safeModulesVersion: string;
  txServiceUrl: string;
  nativeToken: {
    symbol: string;
    decimals: number;
  };
  usdtToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

const MULTISIG_MAINNET_NETWORKS: MultisigNetworkType[] = ['ethereum', 'polygon', 'arbitrum', 'plasma'];
const MULTISIG_TESTNET_NETWORKS: MultisigNetworkType[] = ['sepolia'];

const multisigNetworkConfigs: Record<MultisigNetworkType, MultisigNetworkConfig> = {
  ethereum: {
    chainId: 1n,
    provider: 'https://eth.merkle.io',
    bundlerUrl: 'https://api.pimlico.io/v2/1/rpc?apikey=pim_',
    paymasterUrl: 'https://api.pimlico.io/v2/1/rpc?apikey=pim_',
    paymasterTokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    txServiceUrl: 'https://safe-transaction-mainnet.safe.global',
    nativeToken: {
      symbol: 'ETH',
      decimals: 18,
    },
    usdtToken: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      decimals: 6,
    },
  },
  polygon: {
    chainId: 137n,
    provider: 'https://polygon-rpc.com',
    bundlerUrl: 'https://api.pimlico.io/v2/137/rpc?apikey=pim_',
    paymasterUrl: 'https://api.pimlico.io/v2/137/rpc?apikey=pim_',
    paymasterTokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    txServiceUrl: 'https://safe-transaction-polygon.safe.global',
    nativeToken: {
      symbol: 'POL',
      decimals: 18,
    },
    usdtToken: {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      decimals: 6,
    },
  },
  arbitrum: {
    chainId: 42161n,
    provider: 'https://arb1.arbitrum.io/rpc',
    bundlerUrl: 'https://api.pimlico.io/v2/42161/rpc?apikey=pim_',
    paymasterUrl: 'https://api.pimlico.io/v2/42161/rpc?apikey=pim_',
    paymasterTokenAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    txServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
    nativeToken: {
      symbol: 'ETH',
      decimals: 18,
    },
    usdtToken: {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      decimals: 6,
    },
  },
  plasma: {
    chainId: 9745n,
    provider: 'https://rpc.plasma.to',
    bundlerUrl: 'https://api.pimlico.io/v2/9745/rpc?apikey=pim_',
    paymasterUrl: 'https://api.pimlico.io/v2/9745/rpc?apikey=pim_',
    paymasterTokenAddress: '0x0000000000000000000000000000000000000000',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    txServiceUrl: '',
    nativeToken: {
      symbol: 'ETH',
      decimals: 18,
    },
    usdtToken: {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'USDT',
      decimals: 6,
    },
  },
  sepolia: {
    chainId: 11155111n,
    provider: 'https://sepolia.gateway.tenderly.co',
    bundlerUrl: 'https://api.pimlico.io/v2/11155111/rpc?apikey=pim_',
    paymasterUrl: 'https://api.pimlico.io/v2/11155111/rpc?apikey=pim_',
    paymasterTokenAddress: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
    entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    safeModulesVersion: '0.3.0',
    txServiceUrl: 'https://safe-transaction-sepolia.safe.global',
    nativeToken: {
      symbol: 'ETH',
      decimals: 18,
    },
    usdtToken: {
      address: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
      symbol: 'USDT',
      decimals: 6,
    },
  },
};

export function getMultisigNetworks(networkMode: NetworkMode): MultisigNetworkType[] {
  return networkMode === 'testnet' ? MULTISIG_TESTNET_NETWORKS : MULTISIG_MAINNET_NETWORKS;
}

export function getMultisigNetworkConfig(network: MultisigNetworkType): MultisigNetworkConfig {
  return multisigNetworkConfigs[network];
}

export function getMultisigNetworkConfigs(networkMode: NetworkMode): Record<MultisigNetworkType, MultisigNetworkConfig> {
  const allowedNetworks = getMultisigNetworks(networkMode);
  return Object.fromEntries(
    Object.entries(multisigNetworkConfigs).filter(([key]) =>
      allowedNetworks.includes(key as MultisigNetworkType)
    )
  ) as Record<MultisigNetworkType, MultisigNetworkConfig>;
}
