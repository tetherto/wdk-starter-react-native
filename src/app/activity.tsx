import { useRouter } from 'expo-router';
import { ChevronLeft, Filter } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Transaction, TransactionList } from '@tetherto/wdk-uikit-react-native';
import { assetConfig } from '../config/assets';
import { useWallet } from '../contexts/wallet-context';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet } = useWallet();

  // Transform wallet transactions to display format
  const transactions: Transaction[] = useMemo(() => {
    if (!wallet?.accountData?.transactions) return [];

    // Get the wallet's own addresses for comparison
    const walletAddresses = wallet.accountData.addressMap
      ? Object.values(wallet.accountData.addressMap).map(addr => addr?.toLowerCase())
      : [];

    // Sort transactions by timestamp (newest first)
    return wallet.accountData.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((tx, index) => {
        const fromAddress = tx.from?.toLowerCase();
        const isSent = walletAddresses.includes(fromAddress);
        const amount = parseFloat(tx.amount);
        const config = assetConfig[tx.token as keyof typeof assetConfig];
        const fiatAmount = tx.fiatAmount;
        const fiatCurrency = tx.fiatCurrency;

        return {
          id: `${tx.transactionHash}-${index}`,
          type: isSent ? ('sent' as const) : ('received' as const),
          token: config?.name || tx.token.toUpperCase(),
          amount: `${amount} ${tx.token === 'usdt' ? 'USD₮' : tx.token.toUpperCase()}`,
          fiatAmount: fiatAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          fiatCurrency: fiatCurrency,
          network: tx.blockchain,
        };
      });
  }, [wallet?.accountData?.transactions, wallet?.accountData?.addressMap]);

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={24} color="#FF6501" />
        </TouchableOpacity>
      </View>

      {/* Transactions List */}
      <TransactionList transactions={transactions} />
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
  filterButton: {
    padding: 4,
  },
});
