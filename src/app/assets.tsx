import { FiatCurrency } from '@/services/wdk-service/types';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset, assetConfig } from '../config/assets';
import { useWallet } from '../contexts/wallet-context';

export default function AssetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet } = useWallet();

  // Calculate aggregated balances by denomination from real wallet data
  const assets: Asset[] = useMemo(() => {
    if (!wallet?.accountData?.balances) return [];

    const balanceMap = new Map<
      string,
      { balance: number; fiatValue: number; fiatCurrency: FiatCurrency }
    >();

    // Sum up balances and fiat values by denomination across all networks
    wallet.accountData.balances.forEach(balance => {
      const current = balanceMap.get(balance.denomination) || { balance: 0, fiatValue: 0 };
      balanceMap.set(balance.denomination, {
        balance: current.balance + parseFloat(balance.value),
        fiatValue: current.fiatValue + parseFloat(balance.fiatValue),
        fiatCurrency: balance.currency,
      });
    });

    // Convert to Asset array with real data
    const assetList = Array.from(balanceMap.entries())
      .map(([denomination, { balance: totalBalance, fiatValue: totalFiatValue, fiatCurrency }]) => {
        const config = assetConfig[denomination];
        if (!config) return null;

        const symbol =
          denomination === 'usdt'
            ? 'USD₮'
            : denomination === 'xaut'
              ? 'XAU₮'
              : denomination.toUpperCase();

        return {
          id: denomination,
          name: config.name,
          symbol,
          amount: `${totalBalance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })} ${symbol}`,
          value: `${totalFiatValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} ${fiatCurrency}`,
          icon: config.icon,
          color: config.color,
        };
      })
      .filter(Boolean) as Asset[];

    // Sort by USD value descending
    return assetList.sort((a, b) => {
      const aValue = parseFloat(a.value.replace(/[$,]/g, ''));
      const bValue = parseFloat(b.value.replace(/[$,]/g, ''));
      return bValue - aValue;
    });
  }, [wallet?.accountData?.balances]);

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Assets</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Assets List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {assets.length > 0 ? (
          assets.map(asset => (
            <TouchableOpacity
              key={asset.id}
              style={styles.assetRow}
              onPress={() =>
                router.push({
                  pathname: '/asset-details',
                  params: {
                    walletId: wallet?.id || '',
                    token: asset.symbol,
                  },
                })
              }
            >
              <View style={styles.assetInfo}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color }]}>
                  {typeof asset.icon === 'string' ? (
                    <Text style={styles.assetIconText}>{asset.icon}</Text>
                  ) : (
                    <Image source={asset.icon} style={styles.assetIconImage} />
                  )}
                </View>
                <View style={styles.assetDetails}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                </View>
              </View>
              <View style={styles.assetBalance}>
                <Text style={styles.assetAmount}>{asset.amount}</Text>
                <Text style={styles.assetValue}>{asset.value}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noAssetsContainer}>
            <Text style={styles.noAssetsText}>No assets found</Text>
            <Text style={styles.noAssetsSubtext}>
              Your wallet assets will appear here once you have a balance
            </Text>
          </View>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  assetIconText: {
    fontSize: 24,
    color: '#fff',
  },
  assetIconImage: {
    width: 32,
    height: 32,
  },
  assetDetails: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  assetChange: {
    fontSize: 14,
  },
  assetBalance: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  assetValue: {
    fontSize: 14,
    color: '#999',
  },
  noAssetsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noAssetsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  noAssetsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
