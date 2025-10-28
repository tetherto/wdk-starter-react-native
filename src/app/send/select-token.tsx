import { assetConfig } from '@/config/assets';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { AssetSelector, type Token } from '@tetherto/wdk-uikit-react-native';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import formatAmount from '@/utils/format-amount';
import getDisplaySymbol from '@/utils/get-display-symbol';
import { getRecentTokens, addToRecentTokens } from '@/utils/recent-tokens';
import formatTokenAmount from '@/utils/format-token-amount';
import Header from '@/components/header';

export default function SelectTokenScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();
  const { wallet, balances } = useWallet();

  // Get the scanned address from params (passed from QR scanner)
  const { scannedAddress } = params as { scannedAddress?: string };
  const [recentTokens, setRecentTokens] = useState<string[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    const loadRecentTokens = async () => {
      const recent = await getRecentTokens('send');
      setRecentTokens(recent);
    };
    loadRecentTokens();
  }, []);

  // Calculate token balances from wallet data with fiat values
  useEffect(() => {
    const calculateTokensWithFiatValues = async () => {
      if (!balances.list || !wallet?.enabledAssets) {
        setTokens([]);
        return;
      }

      // Group balances by denomination
      const balanceMap = new Map<string, { totalBalance: number }>();

      balances.list.forEach(balance => {
        const current = balanceMap.get(balance.denomination) || { totalBalance: 0 };
        balanceMap.set(balance.denomination, {
          totalBalance: current.totalBalance + parseFloat(balance.value),
        });
      });

      // Convert to Token array with real balances
      const tokensWithBalances: Token[] = [];

      // Only process enabled assets that we have configuration for
      for (const assetSymbol of wallet.enabledAssets) {
        const config = assetConfig[assetSymbol as keyof typeof assetConfig];
        if (!config) continue;

        const totalBalance = balanceMap.get(assetSymbol)?.totalBalance || 0;

        // Calculate fiat value using pricing service
        let usdValue = 0;
        try {
          usdValue = await pricingService.getFiatValue(
            totalBalance,
            assetSymbol as AssetTicker,
            FiatCurrency.USD
          );
        } catch (error) {
          console.error(`Error calculating fiat value for ${assetSymbol}:`, error);
          // Fallback to 0 if pricing service fails
          usdValue = 0;
        }

        tokensWithBalances.push({
          id: assetSymbol,
          symbol: getDisplaySymbol(assetSymbol),
          name: config.name,
          balance: formatTokenAmount(totalBalance, assetSymbol as AssetTicker, false),
          balanceUSD: `${formatAmount(usdValue)} USD`,
          icon: config.icon,
          color: config.color,
          hasBalance: totalBalance > 0,
        });
      }

      // Sort by USD value (highest first), but keep tokens with 0 balance at the end
      const sortedTokens = tokensWithBalances.sort((a, b) => {
        const aValue = parseFloat(a.balanceUSD.replace(/[$,]/g, ''));
        const bValue = parseFloat(b.balanceUSD.replace(/[$,]/g, ''));

        // If both have 0 balance, sort alphabetically
        if (aValue === 0 && bValue === 0) {
          return a.name.localeCompare(b.name);
        }

        // If one has 0 balance, put it at the end
        if (aValue === 0) return 1;
        if (bValue === 0) return -1;

        // Otherwise sort by value (highest first)
        return bValue - aValue;
      });

      setTokens(sortedTokens);
    };

    calculateTokensWithFiatValues();
  }, [balances.list, wallet?.enabledAssets]);

  const handleSelectToken = useCallback(
    async (token: Token) => {
      // Don't allow selection of tokens with zero balance
      if (!token.hasBalance) {
        return;
      }

      // Save token to recent tokens
      const updatedRecent = await addToRecentTokens(token.name, 'send');
      setRecentTokens(updatedRecent);

      router.push({
        pathname: '/send/select-network',
        params: {
          tokenId: token.id,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          tokenBalance: token.balance,
          tokenBalanceUSD: token.balanceUSD,
          ...(scannedAddress && { scannedAddress }),
        },
      });
    },
    [router, scannedAddress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Send funds" style={styles.header} />
      <AssetSelector
        tokens={tokens}
        recentTokens={recentTokens}
        onSelectToken={handleSelectToken}
      />
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
});
