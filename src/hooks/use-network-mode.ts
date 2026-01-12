import { useCallback, useState, useEffect, useMemo } from 'react';
import {
  getNetworkMode,
  setNetworkMode as saveNetworkMode,
  NetworkMode,
} from '@/services/network-mode-service';
import { CHAINS, NetworkId, toNetworkConfig } from '@/config/chain';
import { TOKENS } from '@/config/token';
import { TokenConfigs, NetworkConfigs } from '@tetherto/wdk-react-native-core';

export const useNetworkMode = () => {
  const [mode, setModeState] = useState<NetworkMode>('mainnet');
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshMode = useCallback(async () => {
    const storedMode = await getNetworkMode();

    setModeState(storedMode);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshMode();
  }, [refreshMode]);

  const setMode = useCallback(async (newMode: NetworkMode) => {
    await saveNetworkMode(newMode);
    setModeState(newMode);
  }, []);

  const toggleMode = useCallback(async () => {
    const newMode = mode === 'mainnet' ? 'testnet' : 'mainnet';
    await setMode(newMode);
  }, [mode, setMode]);

  const chains = useMemo(() => {
    if (mode === 'testnet') {
      return {
        [NetworkId.SEPOLIA]: CHAINS[NetworkId.SEPOLIA],
        [NetworkId.SPARK_REGTEST]: CHAINS[NetworkId.SPARK_REGTEST],
      } as unknown as NetworkConfigs;
    }

    return {
      [NetworkId.ETHEREUM]: CHAINS[NetworkId.ETHEREUM],
      [NetworkId.POLYGON]: CHAINS[NetworkId.POLYGON],
      [NetworkId.ARBITRUM]: CHAINS[NetworkId.ARBITRUM],
      [NetworkId.SPARK]: CHAINS[NetworkId.SPARK],
      [NetworkId.PLASMA]: CHAINS[NetworkId.PLASMA],
    } as unknown as NetworkConfigs;
  }, [mode]);

  const workletChainConfigs = useMemo(() => {
    const chainConfigs: NetworkConfigs = {};
    const chainList =
      mode === 'testnet'
        ? [CHAINS[NetworkId.SEPOLIA], CHAINS[NetworkId.SPARK_REGTEST]]
        : [
            CHAINS[NetworkId.ETHEREUM],
            CHAINS[NetworkId.POLYGON],
            CHAINS[NetworkId.ARBITRUM],
            CHAINS[NetworkId.SPARK],
            CHAINS[NetworkId.PLASMA],
          ];

    chainList.forEach((chain) => {
      chainConfigs[chain.id] = toNetworkConfig(chain);
    });

    return chainConfigs;
  }, [mode]);

  const tokens = useMemo(() => {
    if (mode === 'testnet') {
      return {
        [NetworkId.SEPOLIA]: TOKENS[NetworkId.SEPOLIA],
        [NetworkId.SPARK_REGTEST]: TOKENS[NetworkId.SPARK_REGTEST],
      } as TokenConfigs;
    }

    return {
      [NetworkId.ETHEREUM]: TOKENS[NetworkId.ETHEREUM],
      [NetworkId.POLYGON]: TOKENS[NetworkId.POLYGON],
      [NetworkId.ARBITRUM]: TOKENS[NetworkId.ARBITRUM],
      [NetworkId.SPARK]: TOKENS[NetworkId.SPARK],
      [NetworkId.PLASMA]: TOKENS[NetworkId.PLASMA],
    } as TokenConfigs;
  }, [mode]);

  return {
    mode,
    isLoaded,
    setMode,
    toggleMode,
    refreshMode,
    chains,
    workletChainConfigs,
    tokens,
  };
};
