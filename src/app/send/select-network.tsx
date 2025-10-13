import { Network, NetworkSelector } from '@/components/NetworkSelector';
import { assetConfig } from '@/config/assets';
import { networkConfigs } from '@/config/networks';
import formatAmount from '@/utils/format-amount';
import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FiatCurrency, pricingService } from '@/services/pricing-service';

export default function SelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { wallet } = useWallet();
  const { tokenId, tokenSymbol, tokenName, tokenBalance, tokenBalanceUSD, scannedAddress } =
    params as {
      tokenId: string;
      tokenSymbol: string;
      tokenName: string;
      tokenBalance: string;
      tokenBalanceUSD: string;
      scannedAddress?: string;
    };

  const [networks, setNetworks] = useState<Network[]>([]);

  // Calculate networks with balances and fiat values
  useEffect(() => {
    const calculateNetworks = async () => {
      const tokenConfig = assetConfig[tokenId];
      if (!tokenConfig) {
        setNetworks([]);
        return;
      }

      const networksWithBalances = await Promise.all(
        tokenConfig.supportedNetworks.map(async networkType => {
          const network = networkConfigs[networkType];

          const balance = wallet?.accountData?.balances.find(
            b => networkType === b.networkType && b.denomination === tokenId
          );

          const balanceValue = balance ? parseFloat(balance.value) : 0;

          // Calculate fiat value using pricing service
          const balanceUSD = await pricingService.getFiatValue(
            balanceValue,
            tokenId as AssetTicker,
            FiatCurrency.USD
          );

          return {
            ...network,
            balance: formatAmount(balanceValue),
            balanceFiat: formatAmount(balanceUSD),
            fiatCurrency: FiatCurrency.USD,
            token: tokenId === 'usdt' ? 'USD₮' : tokenId.toUpperCase()
          };
        })
      );

      setNetworks(networksWithBalances);
    };

    calculateNetworks();
  }, [tokenId, wallet?.accountData?.balances]);

  const handleSelectNetwork = useCallback(
    (network: Network) => {
      router.push({
        pathname: '/send/send-details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          tokenBalance: network.balance,
          tokenBalanceUSD: network.balanceFiat,
          network: network.name,
          networkId: network.id,
          ...(scannedAddress && { scannedAddress }),
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName, scannedAddress]
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
        <Text style={styles.headerTitle}>Select network</Text>
        <View style={{ width: 60 }} />
      </View>

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
  description: {
    fontSize: 14,
    color: '#999',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
});
