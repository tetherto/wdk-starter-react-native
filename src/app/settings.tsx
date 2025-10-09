import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '@tetherto/wdk-react-native-provider';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info, Shield, Trash2, Wallet } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, clearWallet } = useWallet();

  const handleBack = () => {
    router.back();
  };

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
              await AsyncStorage.clear();
              clearWallet();
              Alert.alert('Success', 'Wallet deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/onboarding'),
                },
              ]);
            } catch (error) {
              console.error('Failed to delete wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const getNetworkName = (network: string) => {
    const names: Record<string, string> = {
      bitcoin: 'Bitcoin',
      ethereum: 'Ethereum',
      polygon: 'Polygon',
      arbitrum: 'Arbitrum',
      ton: 'TON',
    };
    return names[network] || network;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wallet size={20} color="#FF6501" />
            <Text style={styles.sectionTitle}>Wallet Information</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{wallet?.name || 'Unknown'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Icon</Text>
              <Text style={styles.infoValue}>{wallet?.icon || '💎'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Enabled Assets</Text>
              <Text style={styles.infoValue}>
                {wallet?.enabledAssets
                  ?.map(asset => (asset === 'usdt' ? 'USD₮' : asset.toUpperCase()))
                  .join(', ') || 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* Network Addresses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#FF6501" />
            <Text style={styles.sectionTitle}>Network Addresses</Text>
          </View>

          <View style={styles.addressCard}>
            {wallet?.accountData?.addressMap &&
              Object.entries(wallet.accountData.addressMap).map(([network, address]) => (
                <View key={network} style={styles.addressRow}>
                  <Text style={styles.networkLabel}>{getNetworkName(network)}</Text>
                  <Text style={styles.addressValue}>{formatAddress(address as string)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color="#FF6501" />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WDK Version</Text>
              <Text style={styles.infoValue}>Latest</Text>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <View style={styles.sectionHeader}>
            <Trash2 size={20} color="#FF3B30" />
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          </View>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteWallet}>
            <Trash2 size={20} color="#fff" />
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
    width: 60,
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
    color: '#fff',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  infoValueSmall: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  addressCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
  },
  addressRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  networkLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 13,
    color: '#fff',
    fontFamily: 'monospace',
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  dangerTitle: {
    color: '#FF3B30',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
