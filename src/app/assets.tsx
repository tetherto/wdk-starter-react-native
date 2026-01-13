import { FiatCurrency, pricingService } from '@/services/pricing-service';
import { useWallet, useWalletManager, useBalancesForWallet } from '@tetherto/wdk-react-native-core';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset, TOKEN_UI_CONFIGS, getTokenConfigs } from '@/config/token';
import formatAmount from '@/utils/format-amount';
import getDisplaySymbol from '@/utils/get-display-symbol';
import formatTokenAmount from '@/utils/format-token-amount';
import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { filterNetworksByMode } from '@/services/network-mode-service';
import { useNetworkMode } from '@/hooks/use-network-mode';

export default function AssetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier;
  const { isInitialized } = useWallet({ walletId: currentWalletId });
  const [assets, setAssets] = useState<Asset[]>([]);
  const { mode: networkMode, isLoaded: networkModeLoaded } = useNetworkMode();

  const tokenConfigs = useMemo(() => {
    if (!networkModeLoaded) return {};
    return getTokenConfigs(networkMode);
  }, [networkMode, networkModeLoaded]);

  const { data: balanceResults, isLoading } = useBalancesForWallet(0, tokenConfigs, {
    enabled: isInitialized && networkModeLoaded && Object.keys(tokenConfigs).length > 0,
  });

  const getAssetsWithFiatValue = async () => {
    if (!balanceResults) return [];

    const balanceMap = new Map<string, { totalBalance: number }>();

    balanceResults.forEach((result) => {
      if (!result.success || !result.balance) return;

      const tokenAddress = result.tokenAddress;
      let denomination = 'unknown';

      const networkTokens = tokenConfigs[result.network];
      if (networkTokens) {
        if (tokenAddress === null) {
          denomination = networkTokens.native.symbol.toLowerCase();
        } else {
          const token = networkTokens.tokens.find(
            (t) => t.address?.toLowerCase() === tokenAddress?.toLowerCase()
          );
          if (token) {
            denomination = token.symbol.toLowerCase();
          }
        }
      }

      const balanceNum =
        parseFloat(result.balance) /
        Math.pow(
          10,
          tokenAddress === null
            ? networkTokens?.native.decimals || 18
            : networkTokens?.tokens.find(
                (t) => t.address?.toLowerCase() === tokenAddress?.toLowerCase()
              )?.decimals || 6
        );

      const current = balanceMap.get(denomination) || { totalBalance: 0 };
      balanceMap.set(denomination, {
        totalBalance: current.totalBalance + balanceNum,
      });
    });

    const promises = Array.from(balanceMap.entries()).map(
      async ([denomination, { totalBalance }]) => {
        const config = TOKEN_UI_CONFIGS[denomination];
        if (!config) return null;

        const availableNetworks = filterNetworksByMode(config.supportedNetworks, networkMode);
        if (availableNetworks.length === 0) return null;

        const symbol = getDisplaySymbol(denomination);

        const fiatValue = await pricingService.getFiatValue(
          totalBalance,
          denomination,
          FiatCurrency.USD
        );

        return {
          id: denomination,
          name: config.name,
          symbol,
          amount: formatTokenAmount(totalBalance, denomination, false),
          fiatValue: fiatValue,
          fiatCurrency: FiatCurrency.USD,
          icon: config.icon,
          color: config.color,
        };
      }
    );

    const assetList = (await Promise.all(promises)).filter(Boolean) as Asset[];

    return assetList.sort((a, b) => {
      return b.fiatValue - a.fiatValue;
    });
  };

  const handleAssetPress = (asset: Asset) => {
    router.push({
      pathname: '/token-details',
      params: {
        walletId: 'default',
        token: asset.id,
      },
    });
  };

  useEffect(() => {
    getAssetsWithFiatValue().then(setAssets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceResults, networkMode]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={isLoading} title="Your Assets" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {assets.length > 0 ? (
          assets.map((asset) => (
            <TouchableOpacity
              key={asset.id}
              style={styles.assetRow}
              onPress={() => handleAssetPress(asset)}
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
                <Text style={styles.assetValue}>
                  {formatAmount(asset.fiatValue)} {asset.fiatCurrency}
                </Text>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.card,
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
    color: colors.text,
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
    color: colors.text,
    marginBottom: 4,
  },
  assetBalance: {
    alignItems: 'flex-end',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  assetValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  noAssetsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noAssetsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  noAssetsSubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
