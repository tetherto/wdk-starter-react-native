import { NetworkMode } from '@/services/network-mode-service';

export type SparkNetworkMode = 'MAINNET' | 'TESTNET' | 'REGTEST';

type ChainConfig = {
  chainId: number;
  blockchain: string;
  provider?: string;
  bundlerUrl?: string;
  paymasterUrl?: string;
  paymasterAddress?: string;
  entryPointAddress?: string;
  safeModulesVersion?: string;
  paymasterToken?: { address: string };
  transferMaxFee?: number;
  network?: SparkNetworkMode;
};

const MAINNET_CHAINS: string[] = ['ethereum', 'polygon', 'arbitrum', 'spark', 'plasma'];
const TESTNET_CHAINS: string[] = ['sepolia', 'spark'];

const getChainsConfig = (
  sparkNetwork: SparkNetworkMode = 'MAINNET',
  networkMode?: NetworkMode
): Record<string, ChainConfig> => {
  const allChains: Record<string, ChainConfig> = {
    sepolia: {
      chainId: 11155111,
      blockchain: 'sepolia',
      provider: 'https://sepolia.gateway.tenderly.co',
      bundlerUrl: 'https://api.candide.dev/public/v3/sepolia',
      paymasterUrl: 'https://api.candide.dev/public/v3/sepolia',
      paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      safeModulesVersion: '0.3.0',
      paymasterToken: {
        address: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
      },
      transferMaxFee: 500000,
    },
    plasma: {
      chainId: 9745,
      blockchain: 'plasma',
      provider: 'https://rpc.plasma.to',
      bundlerUrl: 'https://api.candide.dev/public/v3/9745',
      paymasterUrl: 'https://api.candide.dev/public/v3/9745',
      paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      safeModulesVersion: '0.3.0',
      transferMaxFee: 100000,
    },
    spark: {
      chainId: 99999,
      blockchain: 'spark',
      network: sparkNetwork,
    },
    ethereum: {
      chainId: 1,
      blockchain: 'ethereum',
      provider: 'https://eth.merkle.io',
      bundlerUrl: 'https://api.candide.dev/public/v3/ethereum',
      paymasterUrl: 'https://api.candide.dev/public/v3/ethereum',
      paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      safeModulesVersion: '0.3.0',
      paymasterToken: {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      transferMaxFee: 100000,
    },
    arbitrum: {
      chainId: 42161,
      blockchain: 'arbitrum',
      provider: 'https://arb1.arbitrum.io/rpc',
      bundlerUrl: 'https://api.candide.dev/public/v3/arbitrum',
      paymasterUrl: 'https://api.candide.dev/public/v3/arbitrum',
      paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      safeModulesVersion: '0.3.0',
      paymasterToken: {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      },
      transferMaxFee: 100000,
    },
    polygon: {
      chainId: 137,
      blockchain: 'polygon',
      provider: 'https://polygon-rpc.com',
      bundlerUrl: 'https://api.candide.dev/public/v3/polygon',
      paymasterUrl: 'https://api.candide.dev/public/v3/polygon',
      paymasterAddress: '0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba',
      entryPointAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
      safeModulesVersion: '0.3.0',
      paymasterToken: {
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      },
      transferMaxFee: 100000,
    },
  };

  if (!networkMode) {
    return allChains;
  }

  const allowedChains = networkMode === 'testnet' ? TESTNET_CHAINS : MAINNET_CHAINS;
  return Object.fromEntries(
    Object.entries(allChains).filter(([key]) => allowedChains.includes(key))
  ) as Record<string, ChainConfig>;
};

export default getChainsConfig;
