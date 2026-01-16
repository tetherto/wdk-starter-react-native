import Header from '@/components/header';
import { clearAvatar, clearWalletName } from '@/config/avatar-options';
import { networkConfigs, NetworkType } from '@/config/networks';
import useWalletAvatar from '@/hooks/use-wallet-avatar';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import * as Clipboard from 'expo-clipboard';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { Copy, Info, Shield, Trash2, Wallet, Globe, Users, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { colors } from '@/constants/colors';
import getChainsConfig, { SparkNetworkMode } from '@/config/get-chains-config';
import { getNetworkMode, setNetworkMode, NetworkMode, getNetworksForMode } from '@/services/network-mode-service';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId, deleteWallet } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses, getAddress, isInitialized } = useWallet({ walletId: currentWalletId });
  const avatar = useWalletAvatar();
  const [walletAddresses, setWalletAddresses] = useState<Record<string, string>>({});
  const [networkMode, setNetworkModeState] = useState<NetworkMode>('mainnet');
  const [networkModeLoaded, setNetworkModeLoaded] = useState(false);

  useEffect(() => {
    getNetworkMode().then((mode) => {
      setNetworkModeState(mode);
      setNetworkModeLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!networkModeLoaded) return;

    const fetchAddresses = async () => {
      const sparkNetwork: SparkNetworkMode = networkMode === 'testnet' ? 'REGTEST' : 'MAINNET';
      const allowedNetworks = getNetworksForMode(networkMode);

      console.log('[Settings] === Starting fetchAddresses ===');
      console.log('[Settings] isInitialized:', isInitialized, 'networkMode:', networkMode);
      console.log('[Settings] allowedNetworks:', allowedNetworks);
      console.log('[Settings] addresses from hook:', JSON.stringify(addresses, null, 2));

      const addressMap: Record<string, string> = {};

      for (const network of allowedNetworks) {
        console.log(`[Settings] Processing network: ${network}`);
        try {
          const addressData = addresses?.[network];
          console.log(`[Settings] ${network} - addressData from hook:`, JSON.stringify(addressData));
          let address: string | undefined;

          // Handle different address formats: {0: "0x..."} or ["0x..."] or "0x..."
          if (addressData) {
            if (typeof addressData === 'string') {
              address = addressData;
            } else if (Array.isArray(addressData) && addressData[0]) {
              address = addressData[0];
            } else if (typeof addressData === 'object' && addressData['0']) {
              address = addressData['0'];
            }
          }

          if (!address && isInitialized) {
            console.log(`[Settings] ${network} - No cached address, calling getAddress with 10s timeout...`);
            const startTime = Date.now();
            try {
              const timeoutPromise = new Promise<undefined>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout deriving ${network} address`)), 10000)
              );
              address = await Promise.race([
                getAddress(network, 0),
                timeoutPromise
              ]);
              console.log(`[Settings] ${network} - getAddress returned in ${Date.now() - startTime}ms:`, address);
            } catch (deriveError) {
              console.error(`[Settings] ${network} - getAddress ERROR after ${Date.now() - startTime}ms:`, deriveError);
            }
          } else if (!address && !isInitialized) {
            console.log(`[Settings] ${network} - Skipping derivation, WDK not initialized yet`);
          }

          if (address) {
            addressMap[network] = address;
            console.log(`[Settings] ${network} - Added to addressMap`);
          } else {
            console.log(`[Settings] ${network} - No address available`);
          }
        } catch (err) {
          console.error(`[Settings] ${network} - Outer catch error:`, err);
        }
      }

      console.log('[Settings] === Final addressMap ===', JSON.stringify(addressMap, null, 2));
      setWalletAddresses(addressMap);
    };
    fetchAddresses();
  }, [addresses, getAddress, networkMode, isInitialized, networkModeLoaded]);

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'This will permanently delete your wallet and all associated data. Make sure you have backed up your recovery phrase. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Wallet',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAvatar();
              await clearWalletName();

              try {
                await deleteWallet(currentWalletId);
              } catch (deleteError) {
                const errorMessage = String(deleteError);
                if (!errorMessage.includes('does not exist')) {
                  throw deleteError;
                }
              }

              toast.success('Wallet deleted successfully');
              router.dismissAll('/');
            } catch (error) {
              console.error('Failed to delete wallet:', error);
              toast.error('Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const handleCopyAddress = async (address: string, networkName: string) => {
    await Clipboard.setStringAsync(address);
    toast.success(`${networkName} address copied to clipboard`);
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    if (address.length <= 15) return address;
    return `${address.slice(0, 10)}...${address.slice(-10)}`;
  };

  const getNetworkName = (network: string) => {
    if (network === 'spark' && networkMode === 'testnet') {
      return 'Spark Regtest';
    }
    return networkConfigs[network as NetworkType]?.name || network;
  };

  const getAddressType = (network: string): string | null => {
    const config = networkConfigs[network as NetworkType];
    if (config?.accountType === 'Safe') {
      return 'Safe';
    }
    return null;
  };

  const filteredAddresses = Object.entries(walletAddresses).filter(([network]) => {
    const allowedNetworks = getNetworksForMode(networkMode);
    return allowedNetworks.includes(network as NetworkType);
  });

  const handleNetworkModeToggle = async (value: boolean) => {
    const newMode: NetworkMode = value ? 'testnet' : 'mainnet';

    Alert.alert(
      'Switch Network Mode',
      `Switch to ${newMode === 'testnet' ? 'Testnet' : 'Mainnet'}? Please restart the app for changes to take full effect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            await setNetworkMode(newMode);
            setNetworkModeState(newMode);
            toast.success(`Switched to ${newMode === 'testnet' ? 'Testnet' : 'Mainnet'}. Please restart the app.`);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Settings" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Wallet Information</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>My Wallet</Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Icon</Text>
              <Text style={styles.infoValue}>{avatar}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Network Mode</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>Testnet Mode</Text>
              <Switch
                value={networkMode === 'testnet'}
                onValueChange={handleNetworkModeToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Wallet Addresses</Text>
          </View>

          <View style={styles.addressCard}>
            {filteredAddresses.length > 0 ? (
              filteredAddresses.map(([network, address], index, array) => (
                <TouchableOpacity
                  key={network}
                  style={[
                    styles.addressRow,
                    index === array.length - 1 ? styles.addressRowLast : null,
                  ]}
                  onPress={() => handleCopyAddress(address, getNetworkName(network))}
                  activeOpacity={0.7}
                >
                  <View style={styles.addressContent}>
                    <View style={styles.networkLabelRow}>
                      <Text style={styles.networkLabel}>{getNetworkName(network)}</Text>
                      {getAddressType(network) && (
                        <Text style={styles.addressTypeTag}>{getAddressType(network)}</Text>
                      )}
                    </View>
                    <Text style={styles.addressValue}>{formatAddress(address)}</Text>
                  </View>
                  <Copy size={18} color={colors.primary} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noAddressText}>No addresses available</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Multisig Safes</Text>
          </View>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/multisig')}
          >
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Manage Multisig Safes</Text>
              <Text style={styles.menuDescription}>Create, import, and manage multi-signature wallets</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Text style={styles.infoLabel}>WDK Version</Text>
              <Text style={styles.infoValue}>Core</Text>
            </View>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <View style={styles.sectionHeader}>
            <Trash2 size={20} color={colors.danger} />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteWallet}>
            <Trash2 size={20} color={colors.white} />
            <Text style={styles.deleteButtonText}>Delete Wallet</Text>
          </TouchableOpacity>

          <Text style={styles.warningText}>
            Deleting your wallet will remove all data from this device. Make sure you have backed up
            your recovery phrase before proceeding.
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
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  addressRowLast: {
    borderBottomWidth: 0,
  },
  addressContent: {
    flex: 1,
    marginRight: 12,
  },
  networkLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  networkLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addressTypeTag: {
    fontSize: 10,
    color: colors.textTertiary,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  addressValue: {
    fontSize: 13,
    color: colors.text,
    fontFamily: 'monospace',
  },
  noAddressText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  dangerTitle: {
    color: colors.danger,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
