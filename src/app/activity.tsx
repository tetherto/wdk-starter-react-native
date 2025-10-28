import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { Transaction, TransactionList } from '@tetherto/wdk-uikit-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetConfig } from '../config/assets';
import { FiatCurrency, pricingService } from '../services/pricing-service';
import formatTokenAmount from '@/utils/format-token-amount';
import formatUSDValue from '@/utils/format-usd-value';
import Header from '@/components/header';
import { colors } from '@/constants/colors';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { transactions: walletTransactions, addresses } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Transform wallet transactions to display format with fiat values
  const getTransactionsWithFiatValues = async () => {
    if (!walletTransactions.list) return [];

    // Get the wallet's own addresses for comparison
    const walletAddresses = addresses
      ? Object.values(addresses).map(addr => addr.toLowerCase())
      : [];

    // Sort transactions by timestamp (newest first) and calculate fiat values
    const result = await Promise.all(
      walletTransactions.list
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
  }, [walletTransactions.list, addresses]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isLoading={walletTransactions.isLoading} title="Activity" />
      <TransactionList transactions={transactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
