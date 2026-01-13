import { BalanceLoader } from '@/components/BalanceLoader';
import { useWallet, useWalletManager, useBalancesForWallet, useRefreshBalance } from '@tetherto/wdk-react-native-core';
import { Balance } from '@tetherto/wdk-uikit-react-native';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useFocusEffect } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Palette,
  QrCode,
  Settings,
  Shield,
  Star,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AssetConfig, assetConfig, AssetTicker } from '../config/assets';
import getTokenConfigs from '../config/get-token-configs';
import { FiatCurrency, pricingService } from '../services/pricing-service';
import { getNetworkMode, NetworkMode } from '../services/network-mode-service';
import formatAmount from '@/utils/format-amount';
import formatTokenAmount from '@/utils/format-token-amount';
import useWalletAvatar from '@/hooks/use-wallet-avatar';
import { colors } from '@/constants/colors';
import { getWalletName } from '@/config/avatar-options';

type AggregatedBalance = ({
  denomination: string;
  balance: number;
  usdValue: number;
  config: AssetConfig;
} | null)[];

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { isInitialized, addresses } = useWallet({ walletId: currentWalletId });
  const { mutate: refreshBalance } = useRefreshBalance();

  const [networkMode, setNetworkMode] = useState<NetworkMode | null>(null);
  const [networkModeLoaded, setNetworkModeLoaded] = useState(false);

  // Load network mode on mount and when screen gains focus (after settings change)
  useFocusEffect(
    useCallback(() => {
      getNetworkMode().then((mode) => {
        setNetworkMode(mode);
        setNetworkModeLoaded(true);
      });
    }, [])
  );

  const tokenConfigs = useMemo(() => {
    if (!networkModeLoaded) {
      return {} as ReturnType<typeof getTokenConfigs>;
    }
    return getTokenConfigs(networkMode!);
  }, [networkMode, networkModeLoaded]);

  const { data: balanceResults, isLoading: isLoadingBalances, refetch } = useBalancesForWallet(
    0,
    tokenConfigs,
    { enabled: isInitialized && networkModeLoaded && Object.keys(tokenConfigs).length > 0 }
  );

  const [refreshing, setRefreshing] = useState(false);
  const [aggregatedBalances, setAggregatedBalances] = useState<AggregatedBalance>([]);
  const [mounted, setMounted] = useState(false);
  const [walletDisplayName, setWalletDisplayName] = useState('My Wallet');
  const walletExists = isInitialized || Object.keys(addresses).length > 0;
  const avatar = useWalletAvatar();
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getWalletName().then(setWalletDisplayName);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      router.replace('/authorize');
    }
  }, [isInitialized, router]);

  const getAggregatedBalances = async () => {
    if (!balanceResults) return [];

    const map = new Map<string, { totalBalance: number }>();

    balanceResults.forEach((result) => {
      if (!result.success || !result.balance) return;

      const tokenAddress = result.tokenAddress;
      let denomination = 'unknown';

      const networkTokens = tokenConfigs[result.network];
      if (networkTokens) {
        if (tokenAddress === null) {
          denomination = networkTokens.native.symbol.toLowerCase();
        } else {
          const token = networkTokens.tokens.find(t => t.address?.toLowerCase() === tokenAddress?.toLowerCase());
          if (token) {
            denomination = token.symbol.toLowerCase();
          }
        }
      }

      const balanceNum = parseFloat(result.balance) / Math.pow(10,
        tokenAddress === null ? networkTokens?.native.decimals || 18 :
        networkTokens?.tokens.find(t => t.address?.toLowerCase() === tokenAddress?.toLowerCase())?.decimals || 6
      );

      const current = map.get(denomination) || { totalBalance: 0 };
      map.set(denomination, {
        totalBalance: current.totalBalance + balanceNum,
      });
    });

    const promises = Array.from(map.entries()).map(async ([denomination, { totalBalance }]) => {
      const config = assetConfig[denomination];
      if (!config) return null;

      const fiatValue = await pricingService.getFiatValue(
        totalBalance,
        denomination as AssetTicker,
        FiatCurrency.USD
      );

      return {
        denomination,
        balance: totalBalance,
        usdValue: fiatValue,
        config,
      };
    });

    return (await Promise.all(promises))
      .filter(Boolean)
      .filter((asset) => asset && asset.balance > 0)
      .sort((a, b) => (b?.usdValue || 0) - (a?.usdValue || 0));
  };

  const totalPortfolioValue = useMemo(() => {
    return aggregatedBalances.reduce((sum, asset) => sum + (asset?.usdValue || 0), 0);
  }, [aggregatedBalances]);

  const borderOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const suggestions = [
    {
      id: 1,
      icon: Star,
      title: 'Star repo on GitHub',
      color: colors.primary,
      url: 'https://github.com/tetherto/wdk-starter-react-native',
    },
    {
      id: 2,
      icon: Shield,
      title: 'Explore the WDK docs',
      color: colors.primary,
      url: 'https://docs.wallet.tether.io/',
    },
    {
      id: 3,
      icon: Palette,
      title: 'Explore the WDK UI Kit',
      color: colors.primary,
      url: 'https://github.com/tetherto/wdk-uikit-react-native',
    },
  ];

  const handleSendPress = () => {
    router.push('/send/select-token');
  };

  const handleReceivePress = () => {
    router.push('/receive/select-token');
  };

  const handleQRPress = () => {
    router.push('/scan-qr');
  };

  const handleSeeAllTokens = () => {
    router.push('/assets');
  };

  const handleCreateWallet = () => {
    router.push('/wallet-setup/name-wallet');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const handleRefresh = async () => {
    if (!walletExists) return;

    setRefreshing(true);
    try {
      refreshBalance({ accountIndex: 0, type: 'wallet' });
      await refetch();
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getAggregatedBalances().then(setAggregatedBalances);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceResults]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  // Refresh balances when screen comes into focus (e.g., after sending)
  useFocusEffect(
    useCallback(() => {
      if (isInitialized && networkModeLoaded) {
        refreshBalance({ accountIndex: 0, type: 'wallet' });
        refetch();
      }
    }, [isInitialized, networkModeLoaded, refreshBalance, refetch])
  );

  // Auto-refresh balances every 60 seconds
  useEffect(() => {
    if (!isInitialized || !networkModeLoaded) return;

    const intervalId = setInterval(() => {
      refreshBalance({ accountIndex: 0, type: 'wallet' });
      refetch();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [isInitialized, networkModeLoaded, refreshBalance, refetch]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            borderBottomColor: borderOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(30, 30, 30, 0)', 'rgba(30, 30, 30, 1)'],
            }),
          },
        ]}
      >
        <View style={styles.walletInfo}>
          <View style={styles.walletIcon}>
            <Text style={styles.walletIconText}>{avatar}</Text>
          </View>
          <Text style={styles.walletName}>{walletExists ? walletDisplayName : 'No Wallet'}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
            <Settings size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        refreshControl={
          mounted ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              title="Pull to refresh"
              titleColor={colors.textSecondary}
              progressViewOffset={insets.top}
            />
          ) : (
            <RefreshControl
              refreshing={false}
              onRefresh={() => {}}
              tintColor={colors.white}
              colors={[colors.white]}
              progressViewOffset={0}
            />
          )
        }
      >
        {!walletExists && !isLoadingBalances ? (
          <TouchableOpacity onPress={handleCreateWallet}>
            <Text>Create Your First Wallet</Text>
          </TouchableOpacity>
        ) : (
          <View
            style={{
              margin: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Balance
              value={totalPortfolioValue}
              currency="USD"
              isLoading={isLoadingBalances}
              Loader={BalanceLoader}
            />
            {isLoadingBalances ? (
              <View style={{ top: 16, marginRight: 8 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.portfolioSection}>
          {!networkModeLoaded || isLoadingBalances ? (
            <View style={styles.noAssetsContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : aggregatedBalances.length > 0 ? (
            aggregatedBalances.map((asset) => {
              if (!asset) return null;

              return (
                <TouchableOpacity
                  key={asset.denomination}
                  style={styles.assetRow}
                  onPress={() => {
                    if (walletExists) {
                      router.push({
                        pathname: '/token-details',
                        params: {
                          token: asset.denomination.toUpperCase(),
                        },
                      });
                    }
                  }}
                >
                  <View style={styles.assetInfo}>
                    <View style={[styles.assetIcon, { backgroundColor: asset.config.color }]}>
                      <Image source={asset.config.icon} style={styles.assetIconImage} />
                    </View>
                    <View>
                      <Text style={styles.assetName}>{asset.config.name}</Text>
                    </View>
                  </View>
                  <View style={styles.assetBalance}>
                    <Text style={styles.assetAmount}>
                      {formatTokenAmount(asset.balance, asset.denomination as AssetTicker)}
                    </Text>
                    <Text style={styles.assetValue}>{formatAmount(asset.usdValue)} USD</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.noAssetsContainer}>
              <Text style={styles.noAssetsText}>No assets found</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleSeeAllTokens}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.sectionTitle}>Suggestions</Text>
          </View>

          <View style={styles.suggestionsGrid}>
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL(suggestion.url);
                }}
                key={suggestion.id}
                style={styles.suggestionCard}
              >
                <suggestion.icon size={24} color={suggestion.color} />
                <Text style={styles.suggestionText}>{suggestion.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.activitySection}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={styles.sectionTitle}>Activity</Text>
          </View>

          <View style={styles.noAssetsContainer}>
            <Text style={styles.noAssetsText}>No transactions yet</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { marginBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSendPress}>
          <ArrowUpRight size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.qrButton} onPress={handleQRPress}>
          <QrCode size={24} color={colors.black} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReceivePress}>
          <ArrowDownLeft size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 120,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  walletIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  walletIconText: {
    fontSize: 12,
  },
  walletName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    padding: 8,
  },
  portfolioSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingLeft: 16,
    marginBottom: 16,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  assetIconImage: {
    width: 24,
    height: 24,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  assetBalance: {
    alignItems: 'flex-end',
  },
  noAssetsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noAssetsText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  assetValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  seeAllText: {
    fontSize: 16,
    color: colors.primary,
    textAlign: 'center',
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  suggestionCard: {
    flex: 1,
    backgroundColor: colors.card,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  suggestionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  activitySection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 72,
    right: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 48,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    height: 80,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.primary,
  },
});
