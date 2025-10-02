import { BalanceLoader } from '@/components/BalanceLoader';
import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Palette,
  QrCode,
  Settings,
  Shield,
  Star,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
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
import { Balance } from 'react-native-wdk-ui';
import { assetConfig } from '../config/assets';
import { useWallet } from '../contexts/wallet-context';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, isLoading, isUnlocked, refreshWalletBalance } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const hasWallet = !!wallet;

  // Redirect to authorization if wallet is not unlocked
  useEffect(() => {
    if (hasWallet && !isUnlocked) {
      router.replace('/authorize');
    }
  }, [hasWallet, isUnlocked, router]);

  // Calculate aggregated balances by denomination
  const aggregatedBalances = useMemo(() => {
    if (!wallet?.accountData?.balances) return [];

    const balanceMap = new Map<string, { balance: number; fiatValue: number }>();

    // Sum up balances and fiat values by denomination across all networks
    wallet.accountData.balances.forEach(balance => {
      const current = balanceMap.get(balance.denomination) || { balance: 0, fiatValue: 0 };
      balanceMap.set(balance.denomination, {
        balance: current.balance + parseFloat(balance.value),
        fiatValue: current.fiatValue + parseFloat(balance.fiatValue),
      });
    });

    // Convert to array with asset info and filter out zero/negative balances
    return Array.from(balanceMap.entries())
      .map(([denomination, { balance: totalBalance, fiatValue: totalFiatValue }]) => {
        const config = assetConfig[denomination];
        if (!config) return null;

        return {
          denomination,
          balance: totalBalance,
          usdValue: totalFiatValue,
          config,
        };
      })
      .filter(Boolean)
      .filter(asset => asset && asset.balance > 0) // Only show tokens with positive balance
      .sort((a, b) => (b?.usdValue || 0) - (a?.usdValue || 0)); // Sort by USD value descending
  }, [wallet?.accountData?.balances]);

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    return aggregatedBalances.reduce((sum, asset) => sum + (asset?.usdValue || 0), 0);
  }, [aggregatedBalances]);

  const suggestions = [
    {
      id: 1,
      icon: Star,
      title: 'Star repo on GitHub',
      color: '#FF6501',
      url: 'https://github.com/tetherto/wdk-react-native-starter',
    },
    {
      id: 2,
      icon: Shield,
      title: 'Explore the WDK docs',
      color: '#FF6501',
      url: 'https://docs.wallet.tether.io/',
    },
    {
      id: 3,
      icon: Palette,
      title: 'Explore the WDK UI Kit',
      color: '#FF6501',
      url: 'https://github.com/tetherto/wdk-uikit-react-native',
    },
  ];

  // Get real transactions from wallet data
  const transactions = useMemo(() => {
    if (!wallet?.accountData?.transactions) return [];

    // Get the wallet's own addresses for comparison
    const walletAddresses = wallet.accountData.addressMap
      ? Object.values(wallet.accountData.addressMap).map(addr => addr?.toLowerCase())
      : [];

    // Sort transactions by timestamp (newest first) and take the first 3
    return wallet.accountData.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
      .map((tx, index) => {
        const fromAddress = tx.from?.toLowerCase();
        const isSent = walletAddresses.includes(fromAddress);
        const amount = parseFloat(tx.amount);
        const config = assetConfig[tx.token];

        return {
          id: index + 1,
          type: isSent ? 'sent' : 'received',
          asset: config?.name || tx.token.toUpperCase(),
          token: tx.token,
          amount: `${amount} ${tx.token === 'usdt' ? 'USD₮' : tx.token.toUpperCase()}`,
          icon: isSent ? ArrowUpRight : ArrowDownLeft,
          iconColor: isSent ? '#FF3B30' : '#4CAF50',
          blockchain: tx.blockchain,
          hash: tx.transactionHash,
          fiatAmount: tx.fiatAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          currency: tx.fiatCurrency,
        };
      });
  }, [wallet?.accountData?.transactions, wallet?.accountData?.addressMap]);

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

  return (
    <View style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingTop: insets.top }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6501"
            colors={['#FF6501']}
            progressViewOffset={insets.top}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.walletInfo}>
            <View style={styles.walletIcon}>
              <Text style={styles.walletIconText}>{wallet?.icon || '💎'}</Text>
            </View>
            <Text style={styles.walletName}>{wallet?.name || 'No Wallet'}</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.settingsButton} onPress={handleSettingsPress}>
              <Settings size={24} color="#FF6501" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance */}
        {!hasWallet && !isLoading ? (
          <TouchableOpacity onPress={handleCreateWallet}>
            <Text>Create Your First Wallet</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ margin: 12 }}>
            <Balance
              value={totalPortfolioValue}
              currency="EUR"
              isLoading={isLoading}
              Loader={BalanceLoader}
            />
          </View>
        )}

        {/* Portfolio */}
        <View style={styles.portfolioSection}>
          {aggregatedBalances.length > 0 ? (
            aggregatedBalances.map(asset => {
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
                      {asset.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6,
                      })}{' '}
                      {asset.denomination === 'usdt' ? 'USD₮' : asset.denomination.toUpperCase()}
                    </Text>
                    <Text style={styles.assetValue}>
                      $
                      {asset.usdValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
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
            {suggestions.map(suggestion => (
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
          <Text style={styles.sectionTitle}>Activity</Text>

          {transactions.length > 0 ? (
            transactions.map(tx => (
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
                  <Text style={styles.transactionUsdAmount}>
                    {tx.fiatAmount} {tx.currency}
                  </Text>
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
          <ArrowUpRight size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.qrButton} onPress={handleQRPress}>
          <QrCode size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleReceivePress}>
          <ArrowDownLeft size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Receive</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    backgroundColor: '#FF6501',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  walletIconText: {
    fontSize: 12,
  },
  walletName: {
    color: '#fff',
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
    borderLeftColor: '#FF6501',
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
    color: '#fff',
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
    color: '#999',
  },
  assetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  assetValue: {
    fontSize: 14,
    color: '#999',
  },
  seeAllText: {
    fontSize: 16,
    color: '#FF6501',
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
    color: '#fff',
  },
  suggestionsGrid: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  suggestionCard: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  suggestionText: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#333',
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
    color: '#fff',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAssetAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  transactionUsdAmount: {
    fontSize: 14,
    color: '#999',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 20,
    left: 72,
    right: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 48,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
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
    color: '#999',
    marginTop: 4,
  },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    backgroundColor: '#FF6501',
  },
});
