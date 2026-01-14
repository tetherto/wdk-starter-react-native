import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMainnets, getTestnets, NetworkId, CHAINS } from '@/config/chain';

const NETWORK_MODE_KEY = 'network_mode';

export type NetworkMode = 'mainnet' | 'testnet';

export const getNetworkMode = async (): Promise<NetworkMode> => {
  const mode = await AsyncStorage.getItem(NETWORK_MODE_KEY);
  return (mode as NetworkMode) || 'mainnet';
};

export const setNetworkMode = async (mode: NetworkMode): Promise<void> => {
  await AsyncStorage.setItem(NETWORK_MODE_KEY, mode);
};

export const getNetworksForMode = (mode: NetworkMode): NetworkId[] => {
  const chains = mode === 'testnet' ? getTestnets() : getMainnets();
  return chains.map((c) => c.id);
};

export const filterNetworksByMode = (networks: NetworkId[], mode: NetworkMode): NetworkId[] => {
  const allowedNetworks = getNetworksForMode(mode);
  return networks.filter((network) => allowedNetworks.includes(network));
};

export const isTestnetNetwork = (network: NetworkId): boolean => {
  return CHAINS[network]?.isTestnet ?? false;
};

export const isMainnetNetwork = (network: NetworkId): boolean => {
  return !(CHAINS[network]?.isTestnet ?? true);
};
