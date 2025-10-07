import { assetConfig } from '@/config/assets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssetSelector, type Token } from '@tetherto/wdk-uikit-react-native';
import { useWallet } from '../../contexts/wallet-context';

const RECENT_TOKENS_KEY = 'recent_tokens';
const MAX_RECENT_TOKENS = 4;

const saveRecentTokens = async (tokens: string[]) => {
  try {
    await AsyncStorage.setItem(RECENT_TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error saving recent tokens:', error);
  }
};

const getRecentTokens = async (): Promise<string[]> => {
  try {
    const tokens = await AsyncStorage.getItem(RECENT_TOKENS_KEY);
    return tokens ? JSON.parse(tokens) : [];
  } catch (error) {
    console.error('Error loading recent tokens:', error);
    return [];
  }
};

const addToRecentTokens = async (tokenName: string) => {
  try {
    const current = await getRecentTokens();
    const filtered = current.filter(name => name !== tokenName);
    const updated = [tokenName, ...filtered].slice(0, MAX_RECENT_TOKENS);
    await saveRecentTokens(updated);
    return updated;
  } catch (error) {
    console.error('Error adding to recent tokens:', error);
    return [];
  }
};

export default function SelectTokenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { wallet } = useWallet();

  // Get the scanned address from params (passed from QR scanner)
  const { scannedAddress } = params as { scannedAddress?: string };
  const [recentTokens, setRecentTokens] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentTokens = async () => {
      const recent = await getRecentTokens();
      setRecentTokens(recent);
    };
    loadRecentTokens();
  }, []);

  // Calculate token balances from wallet data
  const tokens: Token[] = useMemo(() => {
    if (!wallet?.accountData?.balances || !wallet?.enabledAssets) {
      return [];
    }

    // Group balances by denomination
    const balanceMap = new Map<string, number>();

    wallet.accountData.balances.forEach(balance => {
      const currentTotal = balanceMap.get(balance.denomination) || 0;
      balanceMap.set(balance.denomination, currentTotal + parseFloat(balance.value));
    });

    // Convert to Token array with real balances
    const tokensWithBalances: Token[] = [];

    // Only process enabled assets that we have configuration for
    wallet.enabledAssets.forEach(assetSymbol => {
      const config = assetConfig[assetSymbol as keyof typeof assetConfig];
      if (!config) return;

      const totalBalance = balanceMap.get(assetSymbol) || 0;
      const usdValue = totalBalance * config.priceUSD;

      tokensWithBalances.push({
        id: assetSymbol,
        symbol:
          assetSymbol === 'usdt'
            ? 'USD₮'
            : assetSymbol === 'xaut'
              ? 'XAU₮'
              : assetSymbol.toUpperCase(),
        name: config.name,
        balance: totalBalance.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: assetSymbol === 'btc' ? 8 : 6,
        }),
        balanceUSD: `$${usdValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        icon: config.icon,
        color: config.color,
        hasBalance: totalBalance > 0,
      });
    });

    // Sort by USD value (highest first), but keep tokens with 0 balance at the end
    return tokensWithBalances.sort((a, b) => {
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
  }, [wallet?.accountData?.balances, wallet?.enabledAssets]);

  const handleSelectToken = useCallback(
    async (token: Token) => {
      // Don't allow selection of tokens with zero balance
      if (!token.hasBalance) {
        return;
      }

      // Save token to recent tokens
      const updatedRecent = await addToRecentTokens(token.name);
      setRecentTokens(updatedRecent);

      // For tokens with multiple supported networks, go to network selection
      const tokenConfig = assetConfig[token.id];
      if (tokenConfig && tokenConfig.supportedNetworks.length > 1) {
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
      } else {
        // For single-chain tokens, go directly to send details
        router.push({
          pathname: '/send/send-details',
          params: {
            tokenId: token.id,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            tokenBalance: token.balance,
            tokenBalanceUSD: token.balanceUSD,
            network: token.network || token.name,
            ...(scannedAddress && { scannedAddress }),
          },
        });
      }
    },
    [router, scannedAddress]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send funds</Text>
        <View style={{ width: 60 }} />
      </View>

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
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6501',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
