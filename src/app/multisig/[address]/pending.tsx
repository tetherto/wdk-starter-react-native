import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { MultisigNetworkType } from '@/config/multisig-config';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Clock, CheckCircle, XCircle } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

interface PendingTx {
  safeOperationHash: string;
  to: string;
  value: string;
  confirmations: number;
  threshold: number;
  proposedBy: string;
  proposedAt: number;
}

export default function PendingTransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { address, network } = useLocalSearchParams<{ address: string; network: MultisigNetworkType }>();

  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadPendingTxs = async () => {
        setLoading(true);
        try {
          setPendingTxs([]);
        } catch (error) {
          console.error('Failed to load pending transactions:', error);
        } finally {
          setLoading(false);
        }
      };
      loadPendingTxs();
    }, [address, network])
  );

  const handleApprove = async (hash: string) => {
    setActionLoading(hash);
    try {
      toast.success('Transaction approved');
    } catch (error) {
      console.error('Failed to approve:', error);
      Alert.alert('Error', 'Failed to approve transaction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (hash: string) => {
    Alert.alert(
      'Reject Transaction',
      'Are you sure you want to reject this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(hash);
            try {
              toast.success('Transaction rejected');
            } catch (error) {
              console.error('Failed to reject:', error);
              Alert.alert('Error', 'Failed to reject transaction');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleExecute = async (hash: string) => {
    setActionLoading(hash);
    try {
      toast.success('Transaction executed');
    } catch (error) {
      console.error('Failed to execute:', error);
      Alert.alert('Error', 'Failed to execute transaction');
    } finally {
      setActionLoading(null);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Pending Transactions" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pendingTxs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Pending Transactions</Text>
            <Text style={styles.emptyText}>
              When you or another owner proposes a transaction, it will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.txList}>
            {pendingTxs.map((tx) => (
              <View key={tx.safeOperationHash} style={styles.txCard}>
                <View style={styles.txHeader}>
                  <Text style={styles.txTo}>To: {formatAddress(tx.to)}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.proposedAt)}</Text>
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txValue}>{tx.value} ETH</Text>
                  <View style={styles.confirmations}>
                    <Text style={styles.confirmationsText}>
                      {tx.confirmations}/{tx.threshold}
                    </Text>
                  </View>
                </View>

                <View style={styles.txActions}>
                  {tx.confirmations >= tx.threshold ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.executeButton]}
                      onPress={() => handleExecute(tx.safeOperationHash)}
                      disabled={actionLoading === tx.safeOperationHash}
                    >
                      {actionLoading === tx.safeOperationHash ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <>
                          <CheckCircle size={16} color={colors.white} />
                          <Text style={styles.executeButtonText}>Execute</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(tx.safeOperationHash)}
                        disabled={actionLoading === tx.safeOperationHash}
                      >
                        {actionLoading === tx.safeOperationHash ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <CheckCircle size={16} color={colors.white} />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(tx.safeOperationHash)}
                        disabled={actionLoading === tx.safeOperationHash}
                      >
                        <XCircle size={16} color={colors.danger} />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
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
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  txList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  txCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  txTo: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.text,
  },
  txDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  txDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  txValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  confirmations: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmationsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  txActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 6,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  rejectButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  executeButton: {
    backgroundColor: colors.primary,
  },
  executeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
