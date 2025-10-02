import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
// Define WalletTransaction interface locally since we removed Redux
interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'send' | 'receive';
  amount: string;
  fiatAmount: string;
  fromAddress: string;
  toAddress: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  network: string;
}

interface TransactionItemProps {
  transaction: WalletTransaction;
  onPress?: (transaction: WalletTransaction) => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
        return 'arrow.up.circle.fill';
      case 'receive':
        return 'arrow.down.circle.fill';
      case 'swap':
        return 'arrow.triangle.swap';
      default:
        return 'circle.fill';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'send':
        return '#FF3B30';
      case 'receive':
        return '#34C759';
      case 'swap':
        return '#007AFF';
      default:
        return '#888';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#888';
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePress = () => {
    onPress?.(transaction);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <ThemedView style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol
            name={getTransactionIcon(transaction.type)}
            size={32}
            color={getTransactionColor(transaction.type)}
          />
        </View>

        <View style={styles.details}>
          <View style={styles.mainInfo}>
            <ThemedText style={styles.type}>
              {transaction.type === 'send'
                ? 'Sent'
                : transaction.type === 'receive'
                  ? 'Received'
                  : 'Swapped'}
            </ThemedText>
            <ThemedText style={styles.amount}>
              {transaction.type === 'send' ? '-' : '+'}
              {transaction.amount}
            </ThemedText>
          </View>

          <View style={styles.secondaryInfo}>
            <ThemedText style={styles.address}>
              {transaction.type === 'send'
                ? `To: ${formatAddress(transaction.toAddress)}`
                : `From: ${formatAddress(transaction.fromAddress)}`}
            </ThemedText>
            <ThemedText style={styles.fiatAmount}>
              {transaction.type === 'send' ? '-' : '+'}
              {transaction.fiatAmount}
            </ThemedText>
          </View>

          <View style={styles.footer}>
            <View style={styles.timestampContainer}>
              <ThemedText style={styles.date}>{formatDate(transaction.timestamp)}</ThemedText>
              <ThemedText style={styles.time}>{formatTime(transaction.timestamp)}</ThemedText>
            </View>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(transaction.status) + '20' },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: getStatusColor(transaction.status) }]}
              />
              <ThemedText style={[styles.status, { color: getStatusColor(transaction.status) }]}>
                {transaction.status}
              </ThemedText>
            </View>
          </View>

          {transaction.txHash && (
            <View style={styles.hashContainer}>
              <ThemedText style={styles.hashLabel}>Hash:</ThemedText>
              <ThemedText style={styles.hash} numberOfLines={1}>
                {formatAddress(transaction.txHash)}
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(100, 100, 100, 0.05)',
    borderRadius: 12,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  details: {
    flex: 1,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  secondaryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    opacity: 0.7,
    fontFamily: 'monospace',
  },
  fiatAmount: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hashLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginRight: 4,
  },
  hash: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: 'monospace',
    flex: 1,
  },
});
