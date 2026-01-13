import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkType } from '@/config/networks';

const NETWORK_MODE_KEY = 'network_mode';

export type NetworkMode = 'mainnet' | 'testnet';

const MAINNET_NETWORKS: NetworkType[] = ['ethereum', 'polygon', 'arbitrum', 'spark', 'plasma'];
const TESTNET_NETWORKS: NetworkType[] = ['sepolia', 'spark'];

export const getNetworkMode = async (): Promise<NetworkMode> => {
  const mode = await AsyncStorage.getItem(NETWORK_MODE_KEY);
  return (mode as NetworkMode) || 'mainnet';
};

export const setNetworkMode = async (mode: NetworkMode): Promise<void> => {
  await AsyncStorage.setItem(NETWORK_MODE_KEY, mode);
};

export const getNetworksForMode = (mode: NetworkMode): NetworkType[] => {
  return mode === 'testnet' ? TESTNET_NETWORKS : MAINNET_NETWORKS;
};

export const filterNetworksByMode = (
  networks: NetworkType[],
  mode: NetworkMode
): NetworkType[] => {
  const allowedNetworks = getNetworksForMode(mode);
  return networks.filter((network) => allowedNetworks.includes(network));
};

export const isTestnetNetwork = (network: NetworkType): boolean => {
  return TESTNET_NETWORKS.includes(network);
};

export const isMainnetNetwork = (network: NetworkType): boolean => {
  return MAINNET_NETWORKS.includes(network);
};
