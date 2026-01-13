import { Network, NetworkSelector } from '@/components/NetworkSelector';
import { assetConfig, AssetTicker } from '@/config/assets';
import { networkConfigs, NetworkType } from '@/config/networks';
import formatAmount from '@/utils/format-amount';
import { useWallet, useWalletManager, useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import getTokenConfigs from '@/config/get-token-configs';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import getDisplaySymbol from '@/utils/get-display-symbol';
import formatTokenAmount from '@/utils/format-token-amount';
import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { getNetworkMode, filterNetworksByMode, NetworkMode } from '@/services/network-mode-service';

export default function SelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { isInitialized } = useWallet({ walletId: currentWalletId });
  const { tokenId, tokenSymbol, tokenName, scannedAddress } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    scannedAddress?: string;
  };

  const [networks, setNetworks] = useState<Network[]>([]);
  const [networkMode, setNetworkModeState] = useState<NetworkMode>('mainnet');
  const [networkModeLoaded, setNetworkModeLoaded] = useState(false);

  // Load network mode on focus to pick up changes from settings
  useFocusEffect(
    useCallback(() => {
      getNetworkMode().then((mode) => {
        setNetworkModeState(mode);
        setNetworkModeLoaded(true);
      });
    }, [])
  );

  const tokenConfigs = useMemo(() => {
    if (!networkModeLoaded) return {};
    return getTokenConfigs(networkMode);
  }, [networkMode, networkModeLoaded]);

  const { data: balanceResults } = useBalancesForWallet(0, tokenConfigs, {
    enabled: isInitialized && networkModeLoaded && Object.keys(tokenConfigs).length > 0
  });

  useEffect(() => {
    const calculateNetworks = async () => {
      const tokenConfig = assetConfig[tokenId as keyof typeof assetConfig];

      if (!tokenConfig) {
        setNetworks([]);
        return;
      }

      const filteredNetworks = filterNetworksByMode(tokenConfig.supportedNetworks, networkMode);

      const networkBalanceMap = new Map<string, number>();

      if (balanceResults) {
        balanceResults.forEach((result) => {
          if (!result.success || !result.balance) return;

          const networkTokens = tokenConfigs[result.network];
          if (!networkTokens) return;

          let matchedSymbol = '';
          let decimals = 18;

          if (result.tokenAddress === null) {
            matchedSymbol = networkTokens.native.symbol.toLowerCase();
            decimals = networkTokens.native.decimals;
          } else {
            const token = networkTokens.tokens.find((t) => t.address?.toLowerCase() === result.tokenAddress?.toLowerCase());
            if (token) {
              matchedSymbol = token.symbol.toLowerCase();
              decimals = token.decimals;
            }
          }

          if (matchedSymbol === tokenId.toLowerCase()) {
            const balanceNum = parseFloat(result.balance) / Math.pow(10, decimals);
            networkBalanceMap.set(result.network, (networkBalanceMap.get(result.network) || 0) + balanceNum);
          }
        });
      }

      const networksWithBalances = await Promise.all(
        filteredNetworks.map(async (networkType: NetworkType) => {
          const network = networkConfigs[networkType];
          const balanceValue = networkBalanceMap.get(networkType) || 0;

          const balanceUSD = await pricingService.getFiatValue(
            balanceValue,
            tokenId as AssetTicker,
            FiatCurrency.USD
          );

          const displayName = network.id === 'spark' && networkMode === 'testnet'
            ? 'Spark Regtest'
            : network.name;

          return {
            ...network,
            name: displayName,
            balance: formatTokenAmount(balanceValue, tokenId as AssetTicker, false),
            balanceFiat: formatAmount(balanceUSD),
            fiatCurrency: FiatCurrency.USD,
            token: getDisplaySymbol(tokenId),
          };
        })
      );

      setNetworks(networksWithBalances);
    };

    calculateNetworks();
  }, [tokenId, balanceResults, tokenConfigs, networkMode]);

  const handleSelectNetwork = useCallback(
    (network: Network) => {
      router.push({
        pathname: '/send/details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          tokenBalance: network.balance,
          tokenBalanceUSD: network.balanceFiat,
          networkName: network.name,
          networkId: network.id,
          ...(scannedAddress && { scannedAddress }),
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName, scannedAddress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Select network" style={styles.header} />

      <Text style={styles.description}>
        Select the network you will be using to send {tokenSymbol || tokenName}
      </Text>

      <NetworkSelector networks={networks} onSelectNetwork={handleSelectNetwork} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
});
