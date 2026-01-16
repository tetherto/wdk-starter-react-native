import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { multisigService, StoredSafe } from '@/services/multisig-service';
import { getMultisigNetworkConfig, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ArrowUpRight,
  Clock,
  Copy,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';

export default function SafeDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { address, network } = useLocalSearchParams<{ address: string; network: MultisigNetworkType }>();

  const [safe, setSafe] = useState<StoredSafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nativeBalance, setNativeBalance] = useState<string>('0');
  const [usdtBalance, setUsdtBalance] = useState<string>('0');
  const [pendingCount, setPendingCount] = useState(0);

  const loadSafeData = useCallback(async () => {
    if (!address || !network) return;

    try {
      const safeData = await multisigService.getSafe(address, network);
      setSafe(safeData);

      setNativeBalance('0.00');
      setUsdtBalance('0.00');
      setPendingCount(0);
    } catch (error) {
      console.error('Failed to load safe data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [address, network]);

  useFocusEffect(
    useCallback(() => {
      loadSafeData();
    }, [loadSafeData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSafeData();
  };

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      toast.success('Address copied to clipboard');
    }
  };

  const handleSend = () => {
    router.push({
      pathname: '/multisig/[address]/send',
      params: { address, network },
    });
  };

  const handlePending = () => {
    router.push({
      pathname: '/multisig/[address]/pending',
      params: { address, network },
    });
  };

  const handleOwners = () => {
    router.push({
      pathname: '/multisig/[address]/owners',
      params: { address, network },
    });
  };

  const handleRemoveSafe = () => {
    Alert.alert(
      'Remove Safe',
      'Are you sure you want to remove this Safe from your list? This will not delete the Safe on-chain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await multisigService.removeSafe(address!, network!);
              toast.success('Safe removed');
              router.back();
            } catch (error) {
              toast.error('Failed to remove Safe');
            }
          },
        },
      ]
    );
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const getNetworkIcon = () => {
    return network ? networkConfigs[network]?.icon : null;
  };

  const getNetworkName = () => {
    return network ? networkConfigs[network]?.name || network : '';
  };

  const networkConfig = network ? getMultisigNetworkConfig(network) : null;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Safe Details" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!safe) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Safe Details" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Safe not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title={safe.name}
        showBack
        rightElement={
          <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
            <RefreshCw
              size={24}
              color={refreshing ? colors.textTertiary : colors.primary}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.safeHeader}>
          <View style={styles.networkBadge}>
            <Image source={getNetworkIcon()} style={styles.networkIcon} />
            <Text style={styles.networkName}>{getNetworkName()}</Text>
          </View>

          <TouchableOpacity style={styles.addressRow} onPress={handleCopyAddress}>
            <Text style={styles.address}>{formatAddress(address!)}</Text>
            <Copy size={16} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.thresholdBadge}>
            <Text style={styles.thresholdText}>
              {safe.threshold}/{safe.owners.length} signatures required
            </Text>
          </View>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.sectionTitle}>Balance</Text>

          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <Text style={styles.tokenName}>{networkConfig?.nativeToken.symbol || 'ETH'}</Text>
              <Text style={styles.balanceValue}>{nativeBalance}</Text>
            </View>

            <View style={styles.balanceDivider} />

            <View style={styles.balanceRow}>
              <Text style={styles.tokenName}>{networkConfig?.usdtToken.symbol || 'USDT'}</Text>
              <Text style={styles.balanceValue}>{usdtBalance}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleSend}>
              <ArrowUpRight size={24} color={colors.primary} />
              <Text style={styles.actionText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handlePending}>
              <Clock size={24} color={colors.primary} />
              <Text style={styles.actionText}>Pending</Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={handleOwners}>
              <Users size={24} color={colors.primary} />
              <Text style={styles.actionText}>Owners</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.removeButton} onPress={handleRemoveSafe}>
            <Trash2 size={20} color={colors.danger} />
            <Text style={styles.removeButtonText}>Remove Safe</Text>
          </TouchableOpacity>
          <Text style={styles.removeHint}>
            This only removes the Safe from your app. It will not affect the Safe on-chain.
          </Text>
        </View>
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
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  safeHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  networkIcon: {
    width: 20,
    height: 20,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  thresholdBadge: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  thresholdText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  balanceCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: colors.borderDark,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  removeHint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
});
