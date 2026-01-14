import formatAmount from '@/utils/format-amount';
import { useWallet, useWalletManager, useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TokenDetails } from '../components/TokenDetails';
import { FiatCurrency, pricingService } from '../services/pricing-service';
import { getTokenConfigs, TOKEN_UI_CONFIGS } from '@/config/token';
import { CHAINS, NetworkId } from '@/config/chain';
import getDisplaySymbol from '@/utils/get-display-symbol';
import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useNetworkMode } from '@/hooks/use-network-mode';

export default function TokenDetailsScreen() {
  const router = useDebouncedNavigation();
  const insets = useSafeAreaInsets();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier;
  const { isInitialized, addresses } = useWallet({ walletId: currentWalletId });
  const params = useLocalSearchParams<{ walletId?: string; token?: string }>();

  const { mode: networkMode, isLoaded: networkModeLoaded } = useNetworkMode();

  const tokenConfigs = useMemo(() => {
    if (!networkModeLoaded) return {};
    return getTokenConfigs(networkMode);
  }, [networkMode, networkModeLoaded]);

  const { data: balanceResults, isLoading } = useBalancesForWallet(0, tokenConfigs, {
    enabled: isInitialized && networkModeLoaded && Object.keys(tokenConfigs).length > 0,
  });

  const tokenSymbol = params.token?.toLowerCase();
  const tokenConfig = tokenSymbol ? TOKEN_UI_CONFIGS[tokenSymbol] : null;

  const [tokenData, setTokenData] = useState<{
    symbol: string;
    name: string;
    icon: any;
    color: string;
    totalBalance: number;
    totalUSDValue: number;
    networkBalances: {
      network: string;
      balance: number;
      usdValue: number;
      address: string;
    }[];
    priceUSD: number;
  } | null>(null);

  useEffect(() => {
    const calculateTokenData = async () => {
      if (!balanceResults || !tokenSymbol || !tokenConfig) {
        setTokenData(null);
        return;
      }

      const networkBalancesMap = new Map<string, { balance: number; address: string }>();

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
          const token = networkTokens.tokens.find(
            (t) => t.address?.toLowerCase() === result.tokenAddress?.toLowerCase()
          );
          if (token) {
            matchedSymbol = token.symbol.toLowerCase();
            decimals = token.decimals;
          }
        }

        if (matchedSymbol !== tokenSymbol) return;

        const balanceNum = parseFloat(result.balance) / Math.pow(10, decimals);

        const addressData = addresses?.[result.network];
        const addressStr =
          addressData && typeof addressData === 'object' && 'address' in addressData
            ? (addressData as { address: string }).address
            : typeof addressData === 'string'
              ? addressData
              : '';

        const current = networkBalancesMap.get(result.network) || {
          balance: 0,
          address: addressStr,
        };
        networkBalancesMap.set(result.network, {
          balance: current.balance + balanceNum,
          address: addressStr,
        });
      });

      let totalBalance = 0;
      const networkBalancesPromises = Array.from(networkBalancesMap.entries()).map(
        async ([network, { balance, address }]) => {
          totalBalance += balance;
          const usdValue = await pricingService.getFiatValue(
            balance,
            tokenSymbol,
            FiatCurrency.USD
          );
          return { network, balance, usdValue, address };
        }
      );

      const networkBalances = (await Promise.all(networkBalancesPromises)).filter(
        (item) => item.balance > 0
      );

      const tokenPrice = await pricingService.getFiatValue(1, tokenSymbol, FiatCurrency.USD);
      const totalUSDValue = await pricingService.getFiatValue(
        totalBalance,
        tokenSymbol,
        FiatCurrency.USD
      );

      setTokenData({
        symbol: getDisplaySymbol(tokenSymbol),
        name: tokenConfig.name,
        icon: tokenConfig.icon,
        color: tokenConfig.color,
        totalBalance,
        totalUSDValue,
        networkBalances,
        priceUSD: tokenPrice,
      });
    };

    calculateTokenData();
  }, [balanceResults, tokenSymbol, tokenConfig, addresses, tokenConfigs]);

  const handleSendToken = (network?: NetworkId) => {
    if (!tokenData || !network) return;

    const networkBalance = tokenData.networkBalances.find((nb) => nb.network === network);
    if (!networkBalance) return;

    const networkName = CHAINS[network]?.name || network;

    router.push({
      pathname: '/send/details',
      params: {
        network: networkName,
        networkId: network,
        tokenBalance: networkBalance.balance.toString(),
        tokenBalanceUSD: `${formatAmount(networkBalance.usdValue)} USD`,
        tokenId: tokenSymbol,
        tokenName: tokenData.symbol,
        tokenSymbol: tokenData.symbol,
      },
    });
  };

  if (!tokenData || !tokenConfig) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header isLoading={isLoading} title="Token Details" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Token not found or not supported</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={isLoading} title={`${tokenData.name} Details`} />
      <TokenDetails tokenData={tokenData} onSendPress={handleSendToken} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
  },
});
