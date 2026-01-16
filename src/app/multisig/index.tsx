import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { getNetworkMode, NetworkMode } from '@/services/network-mode-service';
import { multisigService, StoredSafe } from '@/services/multisig-service';
import { getMultisigNetworks, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { useFocusEffect } from 'expo-router';
import { Plus, Shield, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MultisigListScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const [safes, setSafes] = useState<StoredSafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');

  useFocusEffect(
    useCallback(() => {
      const loadSafes = async () => {
        setLoading(true);
        try {
          const mode = await getNetworkMode();
          setNetworkMode(mode);
          const allowedNetworks = getMultisigNetworks(mode);
          const allSafes = await multisigService.getSafes();
          const filteredSafes = allSafes.filter((safe) =>
            allowedNetworks.includes(safe.network)
          );
          setSafes(filteredSafes);
        } catch (error) {
          console.error('Failed to load safes:', error);
        } finally {
          setLoading(false);
        }
      };
      loadSafes();
    }, [])
  );

  const handleCreateSafe = () => {
    router.push('/multisig/create');
  };

  const handleImportSafe = () => {
    router.push('/multisig/import');
  };

  const handleSafePress = (safe: StoredSafe) => {
    router.push({
      pathname: '/multisig/[address]',
      params: { address: safe.address, network: safe.network },
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkIcon = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.icon;
  };

  const getNetworkName = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.name || network;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Multisig Safes" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCreateSafe}>
            <Plus size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Create Safe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleImportSafe}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.actionButtonText}>Import Safe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Safes</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : safes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Shield size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Safes Yet</Text>
              <Text style={styles.emptyText}>
                Create a new multisig Safe or import an existing one to get started.
              </Text>
            </View>
          ) : (
            <View style={styles.safesList}>
              {safes.map((safe) => (
                <TouchableOpacity
                  key={`${safe.network}-${safe.address}`}
                  style={styles.safeCard}
                  onPress={() => handleSafePress(safe)}
                >
                  <View style={styles.safeIconContainer}>
                    <Image source={getNetworkIcon(safe.network)} style={styles.networkIcon} />
                  </View>

                  <View style={styles.safeInfo}>
                    <Text style={styles.safeName}>{safe.name}</Text>
                    <Text style={styles.safeAddress}>{formatAddress(safe.address)}</Text>
                    <View style={styles.safeDetails}>
                      <Text style={styles.safeNetwork}>{getNetworkName(safe.network)}</Text>
                      <Text style={styles.safeThreshold}>
                        {safe.threshold}/{safe.owners.length}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  safesList: {
    gap: 12,
  },
  safeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  safeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  networkIcon: {
    width: 24,
    height: 24,
  },
  safeInfo: {
    flex: 1,
  },
  safeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  safeAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  safeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safeNetwork: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  safeThreshold: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
