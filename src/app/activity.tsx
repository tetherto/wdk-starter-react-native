import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { Transaction, TransactionList } from '@tetherto/wdk-uikit-react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetConfig } from '../config/assets';
import { FiatCurrency, pricingService } from '../services/pricing-service';
import formatTokenAmount from '@/utils/format-token-amount';
import formatUSDValue from '@/utils/format-usd-value';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Transform wallet transactions to display format with fiat values
  const getTransactionsWithFiatValues = async () => {
    if (!wallet?.accountData?.transactions) return [];

    // Get the wallet's own addresses for comparison
    const walletAddresses = wallet.accountData.addressMap
      ? Object.values(wallet.accountData.addressMap).map(addr => addr?.toLowerCase())
      : [];

    // Sort transactions by timestamp (newest first) and calculate fiat values
    const result = await Promise.all(
      wallet.accountData.transactions
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(async (tx, index) => {
          const fromAddress = tx.from?.toLowerCase();
          const isSent = walletAddresses.includes(fromAddress);
          const amount = parseFloat(tx.amount);
          const config = assetConfig[tx.token as keyof typeof assetConfig];

          // Calculate fiat amount using pricing service
          const fiatAmount = await pricingService.getFiatValue(
            amount,
            tx.token as AssetTicker,
            FiatCurrency.USD
          );

          return {
            id: `${tx.transactionHash}-${index}`,
            type: isSent ? ('sent' as const) : ('received' as const),
            token: config?.name || tx.token.toUpperCase(),
            amount: `${formatTokenAmount(amount, tx.token as AssetTicker)}`,
            fiatAmount: formatUSDValue(fiatAmount, false),
            fiatCurrency: FiatCurrency.USD,
            network: tx.blockchain,
          };
        })
    );

    return result;
  };

  useEffect(() => {
    getTransactionsWithFiatValues().then(setTransactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <View style={styles.rightSpacer} />
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
  rightSpacer: {
    width: 60,
  },
});
