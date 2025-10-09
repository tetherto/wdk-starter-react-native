import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Wallet } from '@tetherto/wdk-react-native-provider';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface WalletCardProps {
  wallet: Wallet;
  isActive?: boolean;
  onPress?: (wallet: Wallet) => void;
  onLongPress?: (wallet: Wallet) => void;
}

export function WalletCard({ wallet, isActive = false, onPress, onLongPress }: WalletCardProps) {
  const handlePress = () => {
    onPress?.(wallet);
  };

  const handleLongPress = () => {
    onLongPress?.(wallet);
  };

  const getNetworkIcon = (network: string) => {
    switch (network.toLowerCase()) {
      case 'bitcoin':
        return 'bitcoinsign.circle.fill';
      case 'ethereum':
        return 'e.circle.fill';
      case 'solana':
        return 's.circle.fill';
      default:
        return 'circle.fill';
    }
  };

  const getNetworkColor = (network: string) => {
    switch (network.toLowerCase()) {
      case 'bitcoin':
        return '#F7931A';
      case 'ethereum':
        return '#627EEA';
      case 'solana':
        return '#00D4AA';
      default:
        return '#007AFF';
    }
  };

  return (
    <Pressable
      style={[styles.container, isActive && styles.active]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.walletInfo}>
            <IconSymbol
              name={getNetworkIcon(wallet.network)}
              size={24}
              color={getNetworkColor(wallet.network)}
            />
            <View style={styles.textInfo}>
              <ThemedText style={styles.name}>{wallet.name}</ThemedText>
              <ThemedText style={styles.network}>{wallet.network}</ThemedText>
            </View>
          </View>

          {isActive && (
            <View style={styles.activeBadge}>
              <ThemedText style={styles.activeText}>Active</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.balanceSection}>
          <ThemedText style={styles.balance}>{wallet.balance} BTC</ThemedText>
          <ThemedText style={styles.fiatBalance}>{wallet.fiatBalance}</ThemedText>
        </View>

        <View style={styles.addressSection}>
          <ThemedText style={styles.addressLabel}>Address:</ThemedText>
          <ThemedText style={styles.address} numberOfLines={1}>
            {wallet.address}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.type}>{wallet.type}</ThemedText>
          <ThemedText style={styles.createdAt}>
            Created: {new Date(wallet.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(100, 100, 100, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  active: {
    borderColor: 'rgba(0, 122, 255, 0.5)',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textInfo: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  network: {
    fontSize: 14,
    opacity: 0.7,
    textTransform: 'capitalize',
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  balanceSection: {
    marginBottom: 12,
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  fiatBalance: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 2,
  },
  addressSection: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    fontFamily: 'monospace',
    opacity: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 12,
    opacity: 0.6,
    textTransform: 'capitalize',
  },
  createdAt: {
    fontSize: 12,
    opacity: 0.6,
  },
});
