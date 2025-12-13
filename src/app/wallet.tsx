import { BalanceLoader } from '@/components/BalanceLoader';
import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { Balance } from '@tetherto/wdk-uikit-react-native';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Palette,
  QrCode,
  Settings,
  Shield,
  Star,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { AssetConfig, assetConfig } from '@/config/assets';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import { formatAmountBN } from '@/utils/format-amount';
import { formatTokenAmountBN } from '@/utils/format-token-amount';
import { formatUSDValueBN } from '@/utils/format-usd-value';
import useWalletAvatar from '@/hooks/use-wallet-avatar';
import { colors } from '@/constants/colors';
import { bn, add, gt } from '@/utils/bignumber';

type AggregatedBalance = ({
  denomination: string;
  balance: BigNumber;
  usdValue: BigNumber;
  config: AssetConfig;
} | null)[];

type Transaction = {
  id: number;
  type: string;
  asset: string;
  token: string;
  amount: string;
  icon: any;
  iconColor: string;
  blockchain: string;
  hash: string;
  fiatAmount: BigNumber;
  currency: FiatCurrency;
};

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const {
    wallet,
    isLoading,
    isUnlocked,
    refreshWalletBalance,
    balances,
    addresses,
    transactions: walletTransactions,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [aggregatedBalances, setAggregatedBalances] = useState<AggregatedBalance>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mounted, setMounted] = useState(false);
  const avatar = useWalletAvatar();
  const scrollY = useRef(new Animated.Value(0)).current;

  const hasWallet = !!wallet;

  // Redirect to authorization if wallet is not unlocked
  useEffect(() => {
    if (hasWallet && !isUnlocked) {
      router.replace('/authorize');
    }
  }, [hasWallet, isUnlocked, router]);

  // Calculate aggregated balances by denomination
  const getAggregatedBalances = async () => {
    if (!balances) return [];

    const map = new Map<string, { totalBalance: BigNumber }>();

    // Sum up balances by denomination across all networks
    balances.list.forEach((balance) => {
      const current = map.get(balance.denomination) || { totalBalance: bn(0) };

      map.set(balance.denomination, {
        totalBalance: add(current.totalBalance, balance.value),
      });
    });

    const promises = Array.from(map.entries()).map(async ([denomination, { totalBalance }]) => {
      const config = assetConfig[denomination];
      if (!config) return null;

      // Calculate fiat value using pricing service
      const fiatValue = await pricingService.getFiatValueBN(
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
      .filter((asset) => asset && gt(asset.balance, 0)) // Only show tokens with positive balance
      .sort((a, b) => {
        // Sort by USD value descending
        return b!.usdValue.minus(a!.usdValue).toNumber();
      });
  };

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return aggregatedBalances.reduce(
      (sum, asset) => (asset ? add(sum, asset.usdValue) : sum),
      bn(0)
    );
  }, [aggregatedBalances]);

  // Animated border opacity based on scroll position
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

  // Get real transactions from wallet data
  const getTransactions = async () => {
    if (!walletTransactions) return [];

    // Get the wallet's own addresses for comparison
    const walletAddresses = addresses
      ? Object.values(addresses).map((addr) => addr?.toLowerCase())
      : [];

    const result = await Promise.all(
      walletTransactions.list
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 3)
        .map(async (tx, index) => {
          const fromAddress = tx.from?.toLowerCase();
          const isSent = walletAddresses.includes(fromAddress);
          const amount = bn(tx.amount);
          const config = assetConfig[tx.token];

          // Calculate fiat amount using pricing service
          const fiatAmount = await pricingService.getFiatValueBN(
            amount,
            tx.token as AssetTicker,
            FiatCurrency.USD
          );

          return {
            id: index + 1,
            type: isSent ? 'sent' : 'received',
            asset: config?.name || tx.token.toUpperCase(),
            token: tx.token,
            amount: `${formatTokenAmountBN(amount, tx.token as AssetTicker)}`,
            icon: isSent ? ArrowUpRight : ArrowDownLeft,
            iconColor: isSent ? colors.danger : colors.success,
            blockchain: tx.blockchain,
            hash: tx.transactionHash,
            fiatAmount: fiatAmount,
            currency: FiatCurrency.USD,
          };
        })
    );

    return result;
  };

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

  const handleSeeAllActivity = () => {
    router.push('/activity');
  };

  const handleCreateWallet = () => {
    router.push('/wallet-setup/name-wallet');
  };

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const handleRefresh = async () => {
    if (!wallet) return;

    setRefreshing(true);
    try {
      await refreshWalletBalance();
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getAggregatedBalances().then(setAggregatedBalances);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances]);

  useEffect(() => {
    getTransactions().then(setTransactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTransactions?.list, addresses]);

  // Force component to fully mount before enabling RefreshControl on iOS
  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <Text style={styles.walletName}>{wallet?.name || 'No Wallet'}</Text>
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
        {/* Balance */}
        {!hasWallet && !isLoading ? (
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
              value={totalPortfolioValue.toNumber()}
              currency="USD"
              isLoading={isLoading}
              Loader={BalanceLoader}
            />
            {balances.isLoading ? (
              <View style={{ top: 16, marginRight: 8 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </View>
        )}

        {/* Portfolio */}
        <View style={styles.portfolioSection}>
          {aggregatedBalances.length > 0 ? (
            aggregatedBalances.map((asset) => {
              if (!asset) return null;

              return (
                <TouchableOpacity
                  key={asset.denomination}
                  style={styles.assetRow}
                  onPress={() => {
                    if (wallet) {
                      router.push({
                        pathname: '/token-details',
                        params: {
                          walletId: wallet.id,
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
                      {formatTokenAmountBN(asset.balance, asset.denomination as AssetTicker)}
                    </Text>
                    <Text style={styles.assetValue}>{formatAmountBN(asset.usdValue)} USD</Text>
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

        {/* Suggestions */}
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

        {/* Activity */}
        <View style={styles.activitySection}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={styles.sectionTitle}>Activity</Text>
            {walletTransactions.isLoading ? (
              <View style={{ marginRight: 8 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null}
          </View>

          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.transactionRow}>
                <View style={styles.transactionIcon}>
                  <tx.icon size={16} color={tx.iconColor} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionType}>{tx.asset}</Text>
                  <Text style={styles.transactionSubtitle}>
                    {tx.type === 'sent' ? 'Sent' : 'Received'} • {tx.blockchain}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={styles.transactionAssetAmount}>{tx.amount}</Text>
                  <Text style={styles.transactionUsdAmount}>{formatUSDValueBN(tx.fiatAmount)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noAssetsContainer}>
              <Text style={styles.noAssetsText}>No transactions yet</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleSeeAllActivity}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
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
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAssetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  transactionUsdAmount: {
    fontSize: 14,
    color: colors.textSecondary,
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
