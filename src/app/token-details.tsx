import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TokenDetails } from '../components/TokenDetails';

export default function TokenDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet } = useWallet();
  const params = useLocalSearchParams<{ walletId?: string; token?: string }>();

  const handleBack = () => {
    router.back();
  };

  // Asset configuration (same as in wallet.tsx)
  const assetConfig = {
    btc: {
      name: 'Bitcoin',
      icon: require('../../assets/images/tokens/bitcoin-btc-logo.png'),
      color: '#F7931A',
      priceUSD: 97000,
    },
    usdt: {
      name: 'USD₮',
      icon: require('../../assets/images/tokens/tether-usdt-logo.png'),
      color: '#26A17B',
      priceUSD: 1,
    },
    xaut: {
      name: 'XAU₮',
      icon: require('../../assets/images/tokens/tether-gold-xaut-logo.png'),
      color: '#FFD700',
      priceUSD: 2650,
    },
  };

  const tokenSymbol = params.token?.toLowerCase() as keyof typeof assetConfig;
  const tokenConfig = tokenSymbol ? assetConfig[tokenSymbol] : null;

  // Calculate token balances from wallet data
  const tokenData = useMemo(() => {
    if (!wallet?.accountData?.balances || !tokenSymbol || !tokenConfig) {
      return null;
    }

    // Filter balances for this specific token
    const tokenBalances = wallet.accountData.balances.filter(
      balance => balance.denomination === tokenSymbol
    );

    // Calculate total balance and network breakdown
    let totalBalance = 0;
    const networkBalances = tokenBalances
      .map(balance => {
        const amount = parseFloat(balance.value);
        totalBalance += amount;

        return {
          network: balance.networkType,
          balance: amount,
          usdValue: amount * tokenConfig.priceUSD,
          address: wallet.accountData?.addressMap?.[balance.networkType] || '',
        };
      })
      .filter(item => item.balance > 0); // Only show networks with balance

    return {
      symbol:
        tokenSymbol === 'usdt'
          ? 'USD₮'
          : tokenSymbol === 'xaut'
            ? 'XAU₮'
            : tokenSymbol.toUpperCase(),
      name: tokenConfig.name,
      icon: tokenConfig.icon,
      color: tokenConfig.color,
      totalBalance,
      totalUSDValue: totalBalance * tokenConfig.priceUSD,
      networkBalances,
      priceUSD: tokenConfig.priceUSD,
    };
  }, [wallet, tokenSymbol, tokenConfig]);

  const handleSendToken = (network?: string) => {
    if (!tokenData) return;

    // Navigate to send screen with token and network pre-selected
    router.push({
      pathname: '/send/select-token',
      params: {
        walletId: params.walletId,
        preselectedToken: tokenData.symbol,
        preselectedNetwork: network,
      },
    });
  };

  if (!params.walletId || !wallet) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#FF6501" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Wallet not found</Text>
        </View>
      </View>
    );
  }

  if (!tokenData || !tokenConfig) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#FF6501" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Token not found or not supported</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{tokenData.name} Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Token Details Component */}
      <TokenDetails
        walletId={params.walletId!}
        tokenData={tokenData}
        onSendPress={handleSendToken}
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Same width as back button to center title
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
});
