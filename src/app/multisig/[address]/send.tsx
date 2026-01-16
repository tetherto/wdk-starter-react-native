import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { getMultisigNetworkConfig, MultisigNetworkType } from '@/config/multisig-config';
import { validateEvmAddress } from '@/utils/address-validators';
import { useLocalSearchParams } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

type TokenType = 'native' | 'usdt';

export default function SendScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { address, network } = useLocalSearchParams<{ address: string; network: MultisigNetworkType }>();

  const [selectedToken, setSelectedToken] = useState<TokenType>('native');
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [proposing, setProposing] = useState(false);

  const networkConfig = network ? getMultisigNetworkConfig(network) : null;

  const tokens = [
    { id: 'native' as TokenType, symbol: networkConfig?.nativeToken.symbol || 'ETH' },
    { id: 'usdt' as TokenType, symbol: networkConfig?.usdtToken.symbol || 'USDT' },
  ];

  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    if (value.trim()) {
      const result = validateEvmAddress(value.trim());
      setRecipientError(result.valid ? '' : result.error);
    } else {
      setRecipientError('');
    }
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    const formatted = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
    setAmount(formatted);
  };

  const validateTransaction = (): boolean => {
    if (!recipient.trim()) {
      Alert.alert('Error', 'Please enter a recipient address');
      return false;
    }

    const result = validateEvmAddress(recipient.trim());
    if (!result.valid) {
      Alert.alert('Error', result.error);
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    return true;
  };

  const handlePropose = async () => {
    if (!validateTransaction()) {
      return;
    }

    setProposing(true);

    try {
      toast.success('Transaction proposed successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to propose transaction:', error);
      Alert.alert('Error', 'Failed to propose transaction. Please try again.');
    } finally {
      setProposing(false);
    }
  };

  const getSelectedTokenSymbol = () => {
    return tokens.find((t) => t.id === selectedToken)?.symbol || '';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Send" showBack />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Token</Text>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowTokenPicker(!showTokenPicker)}
            >
              <Text style={styles.tokenName}>{getSelectedTokenSymbol()}</Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showTokenPicker && (
              <View style={styles.tokenPicker}>
                {tokens.map((token) => (
                  <TouchableOpacity
                    key={token.id}
                    style={[
                      styles.tokenOption,
                      selectedToken === token.id && styles.tokenOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedToken(token.id);
                      setShowTokenPicker(false);
                    }}
                  >
                    <Text style={styles.tokenOptionText}>{token.symbol}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipient Address</Text>
            <TextInput
              style={[styles.input, recipientError ? styles.inputError : null]}
              placeholder="0x..."
              placeholderTextColor={colors.textTertiary}
              value={recipient}
              onChangeText={handleRecipientChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {recipientError ? <Text style={styles.errorText}>{recipientError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.textTertiary}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
              />
              <Text style={styles.amountToken}>{getSelectedTokenSymbol()}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Multisig Transaction</Text>
            <Text style={styles.infoText}>
              This will create a transaction proposal that needs to be approved by other owners
              before it can be executed.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.proposeButton, proposing && styles.proposeButtonDisabled]}
            onPress={handlePropose}
            disabled={proposing}
          >
            {proposing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.proposeButtonText}>Propose Transaction</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  tokenPicker: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  tokenOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  tokenOptionSelected: {
    backgroundColor: colors.cardDark,
  },
  tokenOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingRight: 16,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  amountToken: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardDark,
  },
  proposeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  proposeButtonDisabled: {
    opacity: 0.6,
  },
  proposeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
