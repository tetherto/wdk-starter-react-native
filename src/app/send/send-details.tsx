import {
  AssetTicker,
  NetworkType,
  useWallet,
  WDKService,
} from '@tetherto/wdk-react-native-provider';
import { CryptoAddressInput } from '@tetherto/wdk-uikit-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SendDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet, refreshWalletBalance } = useWallet();
  const params = useLocalSearchParams();
  const {
    tokenId,
    tokenSymbol,
    tokenName,
    tokenBalance,
    tokenBalanceUSD,
    network,
    networkId,
    scannedAddress,
  } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    tokenBalance: string;
    tokenBalanceUSD: string;
    network: string;
    networkId: string;
    scannedAddress?: string;
  };

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [inputMode, setInputMode] = useState<'token' | 'fiat'>('token');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<{
    fee?: number;
    loading: boolean;
    error?: string;
  }>({
    fee: undefined,
    loading: false,
    error: undefined,
  });
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sendingTransaction, setSendingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<{
    txId?: { fee: string; hash: string };
    error?: string;
  } | null>(null);

  // Handle scanned address from QR scanner
  useEffect(() => {
    if (scannedAddress) {
      setRecipientAddress(scannedAddress);
    }
  }, [scannedAddress]);

  // Network type mapping
  const getNetworkType = useCallback((networkId: string): NetworkType => {
    const networkMap: Record<string, NetworkType> = {
      ethereum: NetworkType.ETHEREUM,
      polygon: NetworkType.POLYGON,
      arbitrum: NetworkType.ARBITRUM,
      bitcoin: NetworkType.SEGWIT,
    };
    return networkMap[networkId] || NetworkType.ETHEREUM;
  }, []);

  // Asset ticker mapping
  const getAssetTicker = useCallback((tokenId: string): AssetTicker => {
    const assetMap: Record<string, AssetTicker> = {
      btc: AssetTicker.BTC,
      usdt: AssetTicker.USDT,
      xaut: AssetTicker.XAUT,
    };
    return assetMap[tokenId?.toLowerCase()] || AssetTicker.USDT;
  }, []);

  // Get token price in USD from wallet balance data
  // TODO: get token price from pricing provider
  const getTokenPrice = useCallback(
    (tokenId: string): number => {
      if (!wallet?.accountData?.balances) return 0;

      // Find the balance entry for this token to get the exchange rate
      const balanceEntry = wallet.accountData.balances.find(
        b => b.denomination === tokenId?.toLowerCase()
      );

      if (!balanceEntry) return 0;

      const tokenAmount = parseFloat(balanceEntry.value) || 1;
      const fiatValue = parseFloat(balanceEntry.fiatValue) || 0;

      // Calculate price per token
      return tokenAmount > 0 ? fiatValue / tokenAmount : 0;
    },
    [wallet?.accountData?.balances]
  );

  // Pre-calculate fee immediately when screen loads
  const preCalculateGasFee = useCallback(async () => {
    setGasEstimate(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const networkType = getNetworkType(networkId);
      const assetTicker = getAssetTicker(tokenId);

      // Use dummy values for pre-calculation
      // For EVM networks, use any valid EVM address; for Bitcoin, use any valid address
      const dummyRecipient =
        networkType === NetworkType.SEGWIT
          ? 'bc1qraj47d6py592h6rufwkuf8m2xeljdqn34474l3'
          : '0xdAC17F958D2ee523a2206206994597C13D831ec7';

      // Use 1 as dummy amount (doesn't affect gas cost for EVM chains)
      const dummyAmount = 1;

      const gasFee = await WDKService.quoteSendByNetwork(
        networkType,
        0, // account index
        dummyAmount,
        dummyRecipient,
        assetTicker
      );

      setGasEstimate({ fee: gasFee, loading: false });
    } catch (error) {
      console.error('Gas fee pre-calculation failed:', error);
      setGasEstimate({
        fee: undefined,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate fee',
      });
    }
  }, [networkId, tokenId, getNetworkType, getAssetTicker]);

  // Pre-calculate fee when screen loads
  React.useEffect(() => {
    preCalculateGasFee();
  }, [preCalculateGasFee]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleQRScan = useCallback(() => {
    router.push({
      pathname: '/scan-qr',
      params: { returnRoute: '/send/send-details' },
    });
  }, [router]);

  const handlePasteAddress = useCallback(() => {
    // In a real app, this would paste from clipboard
    Alert.alert('Paste', 'Paste from clipboard functionality');
  }, []);

  const handleUseMax = useCallback(() => {
    if (inputMode === 'token') {
      setAmount(tokenBalance.replace(',', ''));
    } else {
      setAmount(tokenBalanceUSD.replace('$', '').replace(',', ''));
    }
    setAmountError(null);
  }, [inputMode, tokenBalance, tokenBalanceUSD]);

  const toggleInputMode = useCallback(() => {
    setInputMode(prev => (prev === 'token' ? 'fiat' : 'token'));
    setAmount('');
    setAmountError(null);
  }, []);

  // Validate amount when it changes
  const validateAmount = useCallback(
    (value: string) => {
      if (!value || parseFloat(value) <= 0) {
        setAmountError(null);
        return;
      }

      const numericBalance = parseFloat(tokenBalance.replace(/,/g, ''));
      const numericBalanceUSD = parseFloat(tokenBalanceUSD.replace(/[$,]/g, ''));
      const numericAmount = parseFloat(value.replace(/,/g, ''));

      if (inputMode === 'token') {
        if (numericAmount > numericBalance) {
          const displaySymbol =
            tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol;
          setAmountError(`Maximum: ${tokenBalance} ${displaySymbol}`);
        } else {
          setAmountError(null);
        }
      } else {
        if (numericAmount > numericBalanceUSD) {
          setAmountError(`Maximum: ${tokenBalanceUSD}`);
        } else {
          setAmountError(null);
        }
      }
    },
    [inputMode, tokenBalance, tokenBalanceUSD, tokenSymbol]
  );

  const handleAmountChange = useCallback(
    (value: string) => {
      // Allow only numbers, decimal point, and comma
      const sanitized = value.replace(/[^0-9.,]/g, '');

      // Replace comma with dot for consistent decimal handling
      const normalized = sanitized.replace(',', '.');

      // Prevent multiple decimal points
      const parts = normalized.split('.');
      const formatted = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');

      setAmount(formatted);
      validateAmount(formatted);
    },
    [validateAmount]
  );

  const validateTransaction = useCallback(() => {
    if (!recipientAddress) {
      Alert.alert('Error', 'Please enter a recipient address');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    // Check if amount exceeds balance
    const numericBalance = parseFloat(tokenBalance.replace(',', ''));
    const numericAmount = parseFloat(amount.replace(',', ''));

    if (inputMode === 'token' && numericAmount > numericBalance) {
      Alert.alert('Error', 'Insufficient balance');
      return false;
    }

    return true;
  }, [recipientAddress, amount, tokenBalance, inputMode]);

  const handleSend = useCallback(async () => {
    if (!validateTransaction()) {
      return;
    }

    setSendingTransaction(true);
    setTransactionResult(null);

    try {
      const networkType = getNetworkType(networkId);
      const assetTicker = getAssetTicker(tokenId);
      const numericAmount = parseFloat(amount);

      const sendResult = await WDKService.sendByNetwork(
        networkType,
        0, // account index
        numericAmount,
        recipientAddress,
        assetTicker
      );

      setTransactionResult({ txId: sendResult });
      setShowConfirmation(true);
    } catch (error) {
      console.error('Transaction failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transaction failed';

      Alert.alert('Transaction Failed', errorMessage, [{ text: 'OK' }]);

      setTransactionResult({ error: errorMessage });
    } finally {
      setSendingTransaction(false);
      refreshWalletBalance();
    }
  }, [
    validateTransaction,
    amount,
    recipientAddress,
    networkId,
    tokenId,
    getNetworkType,
    getAssetTicker,
  ]);

  const handleConfirmSend = useCallback(async () => {
    setShowConfirmation(false);
    router.replace('/wallet');
  }, [router]);

  const displayAmount = useMemo(() => {
    const displaySymbol =
      tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol;
    if (!amount) return inputMode === 'token' ? `0 ${displaySymbol}` : '$0.00';
    if (inputMode === 'token') {
      return `${amount} ${displaySymbol}`;
    }
    return `$${amount}`;
  }, [amount, inputMode, tokenSymbol]);

  const balanceDisplay = useMemo(() => {
    const displaySymbol =
      tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol;
    if (inputMode === 'token') {
      return `Balance: ${tokenBalance} ${displaySymbol}`;
    }
    return `Balance: ${tokenBalanceUSD}`;
  }, [inputMode, tokenBalance, tokenBalanceUSD, tokenSymbol]);

  console.log('transactionResult', transactionResult);

  return (
    <>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <ArrowLeft size={24} color="#FF6501" />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                Send{' '}
                {tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <CryptoAddressInput
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                onPaste={handlePasteAddress}
                onQRScan={handleQRScan}
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enter Amount</Text>
                <View style={styles.amountInputContainer}>
                  <TextInput
                    style={styles.amountInput}
                    placeholder={
                      inputMode === 'token'
                        ? `${tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol} 0.00`
                        : '$ 0.00'
                    }
                    placeholderTextColor="#666"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity style={styles.currencyToggle} onPress={toggleInputMode}>
                    <Text style={styles.currencyToggleText}>
                      {inputMode === 'token'
                        ? tokenSymbol === 'USDT'
                          ? 'USD₮'
                          : tokenSymbol === 'XAUT'
                            ? 'XAU₮'
                            : tokenSymbol
                        : 'USD'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.balanceRow}>
                  <TouchableOpacity onPress={handleUseMax}>
                    <Text style={styles.useMaxText}>Use Max</Text>
                  </TouchableOpacity>
                  <Text style={styles.balanceText}>{balanceDisplay}</Text>
                </View>
                {amountError && <Text style={styles.amountError}>{amountError}</Text>}
              </View>

              <View style={styles.gasSection}>
                <Text style={styles.gasTitle}>Estimated Fee:</Text>
                {gasEstimate.loading ? (
                  <Text style={styles.gasAmount}>Calculating...</Text>
                ) : gasEstimate.error ? (
                  <Text style={[styles.gasAmount, { color: '#FF6B6B' }]}>
                    Error calculating fee
                  </Text>
                ) : gasEstimate.fee !== undefined ? (
                  <>
                    <Text style={styles.gasAmount}>
                      {gasEstimate.fee.toLocaleString('en-US', {
                        minimumFractionDigits: tokenSymbol === 'BTC' ? 8 : 6,
                        maximumFractionDigits: tokenSymbol === 'BTC' ? 8 : 6,
                      })}{' '}
                      {tokenSymbol === 'USDT'
                        ? 'USD₮'
                        : tokenSymbol === 'XAUT'
                          ? 'XAU₮'
                          : tokenSymbol}
                    </Text>
                    <Text style={styles.gasUsd}>
                      ≈ $
                      {(gasEstimate.fee * getTokenPrice(tokenId)).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.gasAmount}>Loading fee estimate...</Text>
                )}
                {gasEstimate.error && <Text style={styles.gasError}>{gasEstimate.error}</Text>}
              </View>
            </ScrollView>

            <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (amountError || !amount || !recipientAddress || sendingTransaction) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!!(amountError || !amount || !recipientAddress || sendingTransaction)}
              >
                <Text
                  style={[
                    styles.sendButtonText,
                    (amountError || !amount || !recipientAddress || sendingTransaction) &&
                      styles.sendButtonTextDisabled,
                  ]}
                >
                  {sendingTransaction ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Transaction Submitted</Text>
            <Text style={styles.modalDescription}>
              Your transaction has been submitted and is now processing.
            </Text>

            {transactionResult?.txId && (
              <>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionLabel}>Transaction Hash:</Text>
                  <Text style={styles.transactionId} numberOfLines={1} ellipsizeMode="middle">
                    {transactionResult.txId.hash}
                  </Text>
                </View>
                <View style={styles.transactionSummary}>
                  <Text style={styles.summaryLabel}>Fee:</Text>
                  <Text style={styles.summaryValue}>
                    {parseFloat(transactionResult.txId.fee) / 1000000}{' '}
                    {tokenSymbol === 'USDT'
                      ? 'USD₮'
                      : tokenSymbol === 'XAUT'
                        ? 'XAU₮'
                        : tokenSymbol}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.transactionSummary}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>
                {amount}{' '}
                {tokenSymbol === 'USDT' ? 'USD₮' : tokenSymbol === 'XAUT' ? 'XAU₮' : tokenSymbol}
              </Text>
            </View>

            <View style={styles.transactionSummary}>
              <Text style={styles.summaryLabel}>To:</Text>
              <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="middle">
                {recipientAddress}
              </Text>
            </View>

            <View style={styles.transactionSummary}>
              <Text style={styles.summaryLabel}>Network:</Text>
              <Text style={styles.summaryValue}>{network}</Text>
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={handleConfirmSend}>
              <Text style={styles.modalButtonText}>Close & Return to Main Screen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  currencyToggle: {
    backgroundColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  useMaxText: {
    color: '#FF6501',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceText: {
    color: '#999',
    fontSize: 14,
  },
  gasSection: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  gasTitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  gasAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  gasUsd: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  gasError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  amountError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: '#121212',
  },
  sendButton: {
    backgroundColor: '#FF6501',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    marginTop: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  notificationToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    marginRight: 12,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    backgroundColor: '#333',
    borderRadius: 14,
    padding: 2,
  },
  toggleOff: {
    width: 24,
    height: 24,
    backgroundColor: '#666',
    borderRadius: 12,
  },
  modalButton: {
    backgroundColor: '#FF6501',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDetails: {
    backgroundColor: '#2C2C2C',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  transactionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 14,
    color: '#FF6501',
    fontFamily: 'monospace',
  },
  transactionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#999',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
});
