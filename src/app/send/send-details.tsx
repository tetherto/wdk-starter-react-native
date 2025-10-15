import { AssetTicker, useWallet, WDKService } from '@tetherto/wdk-react-native-provider';
import { CryptoAddressInput } from '@tetherto/wdk-uikit-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import {
  getAssetTicker,
  getNetworkType,
  calculateGasFee,
  type GasFeeEstimate,
} from '@/utils/gas-fee-calculator';
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
import * as Clipboard from 'expo-clipboard';
import getDisplaySymbol from '@/utils/get-display-symbol';
import formatTokenAmount from '@/utils/format-token-amount';
import formatUSDValue from '@/utils/format-usd-value';

export default function SendDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refreshWalletBalance } = useWallet();
  const params = useLocalSearchParams();
  const {
    tokenId,
    tokenSymbol,
    tokenBalance,
    tokenBalanceUSD,
    networkName,
    networkId,
    scannedAddress,
  } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    tokenBalance: string;
    tokenBalanceUSD: string;
    networkName: string;
    networkId: string;
    scannedAddress?: string;
  };

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [inputMode, setInputMode] = useState<'token' | 'fiat'>('token');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoadingGasEstimate, setIsLoadingGasEstimate] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate>({
    fee: undefined,
    error: undefined,
  });
  const [amountError, setAmountError] = useState<string | null>(null);
  const [sendingTransaction, setSendingTransaction] = useState(false);
  const [transactionResult, setTransactionResult] = useState<{
    txId?: { fee: string; hash: string };
    error?: string;
  } | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number>(0);

  // Handle scanned address from QR scanner
  useEffect(() => {
    if (scannedAddress) {
      setRecipientAddress(scannedAddress);
    }
  }, [scannedAddress]);

  // Calculate token price using pricing service
  useEffect(() => {
    const calculateTokenPrice = async () => {
      try {
        const assetTicker = getAssetTicker(tokenId);
        const price = await pricingService.getFiatValue(1, assetTicker, FiatCurrency.USD);
        setTokenPrice(price);
      } catch (error) {
        console.error('Failed to get token price:', error);
        setTokenPrice(0);
      }
    };

    calculateTokenPrice();
  }, [tokenId]);

  // Helper function to convert amount to token value based on input mode
  const getTokenAmount = useCallback(
    (amountValue: string) => {
      const numericAmount = parseFloat(amountValue.replace(/,/g, ''));
      if (inputMode === 'fiat' && tokenPrice > 0) {
        return numericAmount / tokenPrice;
      }
      return numericAmount;
    },
    [inputMode, tokenPrice]
  );

  // Pre-calculate fee immediately when screen loads
  const handleCalculateGasFee = useCallback(
    async (showLoading = true, amountValue?: string) => {
      if (showLoading) {
        setIsLoadingGasEstimate(true);
        setGasEstimate(prev => ({ ...prev, error: undefined }));
      }

      // Convert amount to token value if provided
      const numericAmount = amountValue ? getTokenAmount(amountValue) : undefined;

      const estimate = await calculateGasFee(networkId, tokenId, numericAmount);

      setGasEstimate(estimate);
      setIsLoadingGasEstimate(false);
    },
    [networkId, tokenId, getTokenAmount]
  );

  // Pre-calculate fee when screen loads (skip for BTC as it requires amount)
  useEffect(() => {
    const isBtc = tokenId.toLowerCase() === 'btc';
    if (!isBtc) {
      handleCalculateGasFee();
    }
  }, [handleCalculateGasFee, tokenId]);

  // For BTC, calculate gas fee when amount changes
  useEffect(() => {
    const isBtc = tokenId.toLowerCase() === 'btc';
    if (isBtc && amount && parseFloat(amount) > 0) {
      handleCalculateGasFee(true, amount);
    }
  }, [amount, tokenId, handleCalculateGasFee]);

  // Refetch token price and gas fee every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Refetch token price
      try {
        const assetTicker = getAssetTicker(tokenId);
        const price = await pricingService.getFiatValue(1, assetTicker, FiatCurrency.USD);
        setTokenPrice(price);
      } catch (error) {
        console.error('Failed to refresh token price:', error);
      }

      // Refetch gas fee without showing loading state
      const isBtc = tokenId.toLowerCase() === 'btc';
      if (!isBtc || (isBtc && amount && parseFloat(amount) > 0)) {
        handleCalculateGasFee(false, amount);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [tokenId, handleCalculateGasFee, amount]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleQRScan = useCallback(() => {
    router.push({
      pathname: '/scan-qr',
      params: {
        returnRoute: '/send/send-details',
        tokenId,
        tokenSymbol,
        tokenBalance,
        tokenBalanceUSD,
        networkName,
        networkId,
        scannedAddress,
      },
    });
  }, [router]);

  const handlePasteAddress = useCallback(() => {
    Clipboard.getStringAsync().then(setRecipientAddress);
  }, []);

  const handleUseMax = useCallback(() => {
    const numericBalance = parseFloat(tokenBalance.replace(/,/g, ''));
    const numericBalanceUSD = parseFloat(tokenBalanceUSD.replace(/[$,]/g, ''));

    if (inputMode === 'token') {
      // Subtract gas fee from token balance
      let maxAmount = numericBalance;
      if (gasEstimate.fee !== undefined) {
        maxAmount = Math.max(0, numericBalance - gasEstimate.fee);
      }
      setAmount(maxAmount.toString());
    } else {
      // Subtract gas fee (converted to USD) from balance USD
      let maxAmountUSD = numericBalanceUSD;
      if (gasEstimate.fee !== undefined && tokenPrice > 0) {
        const gasFeeUSD = gasEstimate.fee * tokenPrice;
        maxAmountUSD = Math.max(0, numericBalanceUSD - gasFeeUSD);
      }
      // Format fiat amount to 2 decimal places
      setAmount(maxAmountUSD.toFixed(2));
    }
    setAmountError(null);
  }, [inputMode, tokenBalance, tokenBalanceUSD, gasEstimate.fee, tokenPrice]);

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
          setAmountError(
            `Maximum: ${formatTokenAmount(numericBalance, tokenSymbol as AssetTicker)}`
          );
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

      // Convert fiat to token amount if in fiat mode
      let numericAmount = parseFloat(amount);
      if (inputMode === 'fiat' && tokenPrice > 0) {
        numericAmount = numericAmount / tokenPrice;
      }

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
    refreshWalletBalance,
    inputMode,
    tokenPrice,
  ]);

  const handleConfirmSend = useCallback(async () => {
    setShowConfirmation(false);
    router.replace('/wallet');
  }, [router]);

  const balanceDisplay = useMemo(() => {
    if (inputMode === 'token') {
      return `Balance: ${formatTokenAmount(parseFloat(tokenBalance), tokenSymbol as AssetTicker)}`;
    }
    return `Balance: ${formatUSDValue(parseFloat(tokenBalanceUSD))}`;
  }, [inputMode, tokenBalance, tokenBalanceUSD, tokenSymbol]);

  const getFeeFromTransactionResult = (
    transactionResult: { txId?: { fee: string; hash: string } },
    token: AssetTicker
  ) => {
    const fee = transactionResult.txId?.fee;
    if (!fee) return '0';

    const value = Number(fee) / WDKService.getDenominationValue(token);
    return formatTokenAmount(value, token);
  };

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
              <Text style={styles.headerTitle}>Send {getDisplaySymbol(tokenSymbol)}</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Transaction Summary */}
              <View style={styles.transactionRecap}>
                <View style={styles.recapRow}>
                  <Text style={styles.recapLabel}>Token:</Text>
                  <Text style={styles.recapValue}>
                    {getDisplaySymbol(tokenSymbol)}
                    <Text style={styles.recapValueSecondary}>({tokenSymbol})</Text>
                  </Text>
                </View>
                <View style={styles.recapDivider} />
                <View style={styles.recapRow}>
                  <Text style={styles.recapLabel}>Network:</Text>
                  <Text style={styles.recapValue}>{networkName}</Text>
                </View>
              </View>

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
                      inputMode === 'token' ? `${getDisplaySymbol(tokenSymbol)} 0.00` : '$ 0.00'
                    }
                    placeholderTextColor="#666"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity style={styles.currencyToggle} onPress={toggleInputMode}>
                    <Text style={styles.currencyToggleText}>
                      {inputMode === 'token' ? getDisplaySymbol(tokenSymbol) : 'USD'}
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
                <View style={styles.gasTitleRow}>
                  <Text style={styles.gasTitle}>Estimated Fee:</Text>
                  <TouchableOpacity
                    onPress={() => handleCalculateGasFee(true, amount)}
                    disabled={isLoadingGasEstimate || (tokenId.toLowerCase() === 'btc' && !amount)}
                    style={styles.refreshButton}
                  >
                    <RefreshCw
                      size={18}
                      color={
                        isLoadingGasEstimate || (tokenId.toLowerCase() === 'btc' && !amount)
                          ? '#666'
                          : '#FF6501'
                      }
                      style={isLoadingGasEstimate ? styles.refreshIconLoading : undefined}
                    />
                  </TouchableOpacity>
                </View>
                {isLoadingGasEstimate ? (
                  <Text style={styles.gasAmount}>Calculating...</Text>
                ) : gasEstimate.error ? (
                  <Text style={styles.gasError}>{gasEstimate.error}</Text>
                ) : tokenId.toLowerCase() === 'btc' && (!amount || parseFloat(amount) <= 0) ? (
                  <Text style={styles.gasError}>Insert amount for gas fee estimation</Text>
                ) : gasEstimate.fee !== undefined ? (
                  <>
                    <Text style={styles.gasAmount}>
                      {formatTokenAmount(gasEstimate.fee, tokenSymbol as AssetTicker)}
                    </Text>
                    <Text style={styles.gasUsd}>
                      ≈ {formatUSDValue(gasEstimate.fee * tokenPrice)}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.gasAmount}>Loading fee estimate...</Text>
                )}
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
              <View style={styles.transactionSummary}>
                <Text style={styles.summaryLabel}>Fee:</Text>
                <Text style={styles.summaryValue}>
                  {getFeeFromTransactionResult(transactionResult, tokenSymbol as AssetTicker)}
                </Text>
              </View>
            )}

            <View style={styles.transactionSummary}>
              <Text style={styles.summaryLabel}>Amount:</Text>
              <Text style={styles.summaryValue}>
                {formatTokenAmount(parseFloat(amount || '0'), tokenSymbol as AssetTicker)}
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
              <Text style={styles.summaryValue}>{networkName}</Text>
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
  gasTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gasTitle: {
    fontSize: 14,
    color: '#999',
  },
  refreshButton: {
    padding: 4,
  },
  refreshIconLoading: {
    opacity: 0.5,
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
    color: '#999',
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
  transactionRecap: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recapLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  recapValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  recapValueSecondary: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  recapDivider: {
    height: 1,
    backgroundColor: '#2C2C2C',
    marginVertical: 4,
  },
});
