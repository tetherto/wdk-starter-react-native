import { assetConfig } from '@/config/assets';
import { AssetTicker, NetworkType, useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TokenDetails } from '@/components/TokenDetails';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import { networkConfigs } from '@/config/networks';
import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { formatAmount, getDisplaySymbol, add, bn, gt } from '@/utils';

export default function TokenDetailsScreen() {
  const router = useDebouncedNavigation();
  const insets = useSafeAreaInsets();
  const { wallet, balances, addresses } = useWallet();
  const params = useLocalSearchParams<{ walletId?: string; token?: string }>();

  const tokenSymbol = params.token?.toLowerCase() as keyof typeof assetConfig;
  const tokenConfig = tokenSymbol ? assetConfig[tokenSymbol] : null;

  const [tokenData, setTokenData] = useState<{
    symbol: string;
    name: string;
    icon: any;
    color: string;
    totalBalance: BigNumber;
    totalUSDValue: BigNumber;
    networkBalances: {
      network: string;
      balance: BigNumber;
      usdValue: BigNumber;
      address: string;
    }[];
    priceUSD: BigNumber;
  } | null>(null);

  // Calculate token balances from wallet data with async pricing
  useEffect(() => {
    const calculateTokenData = async () => {
      if (!balances.list || !tokenSymbol || !tokenConfig) {
        setTokenData(null);
        return;
      }

      // Filter balances for this specific token
      const tokenBalances = balances.list.filter((balance) => balance.denomination === tokenSymbol);

      // Calculate total balance and network breakdown with fiat values
      let totalBalance = bn('0');
      const networkBalancesPromises = tokenBalances.map(async (balance) => {
        const amount = bn(balance.value);
        totalBalance = add(totalBalance, amount);

        // Calculate fiat value using pricing service
        const usdValue = await pricingService.getFiatValueBN(
          amount,
          tokenSymbol as AssetTicker,
          FiatCurrency.USD
        );

        return {
          network: balance.networkType,
          balance: amount,
          usdValue,
          address: addresses?.[balance.networkType] || '',
        };
      });

      const networkBalances = (await Promise.all(networkBalancesPromises)).filter((item) =>
        gt(item.balance, 0)
      );

      const tokenPrice = await pricingService.getFiatValueBN(
        bn('1'),
        tokenSymbol as AssetTicker,
        FiatCurrency.USD
      );

      const totalUSDValue = await pricingService.getFiatValueBN(
        totalBalance,
        tokenSymbol as AssetTicker,
        FiatCurrency.USD
      );

      setTokenData({
        symbol: getDisplaySymbol(tokenSymbol) as AssetTicker,
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
  }, [balances, tokenSymbol, tokenConfig, addresses]);

  const handleSendToken = (network?: NetworkType) => {
    if (!tokenData || !network) return;

    // Find the specific network balance
    const networkBalance = tokenData.networkBalances.find((nb) => nb.network === network);
    if (!networkBalance) return;

    // Capitalize network name (e.g., "polygon" -> "Polygon")
    const networkName = networkConfigs[network].name;

    // Navigate to send details screen with all required params
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

  if (!params.walletId || !wallet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header isLoading={balances.isLoading} title="Token Details" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Wallet not found</Text>
        </View>
      </View>
    );
  }

  if (!tokenData || !tokenConfig) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header isLoading={balances.isLoading} title="Token Details" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Token not found or not supported</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={balances.isLoading} title={`${tokenData.name} Details`} />
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
