import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { getNetworkMode, NetworkMode } from '@/services/network-mode-service';
import { multisigService } from '@/services/multisig-service';
import { getMultisigNetworks, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { validateEvmAddress } from '@/utils/address-validators';
import { ChevronDown, Shield } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function ImportSafeScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();

  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');
  const [availableNetworks, setAvailableNetworks] = useState<MultisigNetworkType[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<MultisigNetworkType | null>(null);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [safeAddress, setSafeAddress] = useState('');
  const [safeName, setSafeName] = useState('');
  const [importing, setImporting] = useState(false);
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    const init = async () => {
      const mode = await getNetworkMode();
      setNetworkMode(mode);
      const networks = getMultisigNetworks(mode);
      setAvailableNetworks(networks);
      if (networks.length > 0) {
        setSelectedNetwork(networks[0]);
      }
    };
    init();
  }, []);

  const handleAddressChange = (value: string) => {
    setSafeAddress(value);
    if (value.trim()) {
      const result = validateEvmAddress(value.trim());
      setAddressError(result.valid ? '' : result.error);
    } else {
      setAddressError('');
    }
  };

  const handleImport = async () => {
    if (!selectedNetwork) {
      Alert.alert('Error', 'Please select a network');
      return;
    }

    if (!safeAddress.trim()) {
      Alert.alert('Error', 'Please enter a Safe address');
      return;
    }

    const result = validateEvmAddress(safeAddress.trim());
    if (!result.valid) {
      Alert.alert('Error', result.error);
      return;
    }

    if (!safeName.trim()) {
      Alert.alert('Error', 'Please enter a name for the Safe');
      return;
    }

    setImporting(true);

    try {
      const existingSafe = await multisigService.getSafe(safeAddress.trim(), selectedNetwork);
      if (existingSafe) {
        Alert.alert('Error', 'This Safe is already imported');
        setImporting(false);
        return;
      }

      await multisigService.addSafe({
        address: safeAddress.trim(),
        network: selectedNetwork,
        name: safeName.trim(),
        owners: [],
        threshold: 0,
        createdAt: Date.now(),
      });

      toast.success('Safe imported successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to import safe:', error);
      Alert.alert('Error', 'Failed to import Safe. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const getNetworkIcon = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.icon;
  };

  const getNetworkName = (network: MultisigNetworkType) => {
    return networkConfigs[network]?.name || network;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Import Safe" showBack />

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
          <View style={styles.infoCard}>
            <Shield size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              Import an existing Safe by entering its address. Make sure you are one of the owners.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Network</Text>
            <TouchableOpacity
              style={styles.networkSelector}
              onPress={() => setShowNetworkPicker(!showNetworkPicker)}
            >
              {selectedNetwork && (
                <>
                  <Image source={getNetworkIcon(selectedNetwork)} style={styles.networkIcon} />
                  <Text style={styles.networkName}>{getNetworkName(selectedNetwork)}</Text>
                </>
              )}
              <ChevronDown size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {showNetworkPicker && (
              <View style={styles.networkPicker}>
                {availableNetworks.map((network) => (
                  <TouchableOpacity
                    key={network}
                    style={[
                      styles.networkOption,
                      selectedNetwork === network && styles.networkOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedNetwork(network);
                      setShowNetworkPicker(false);
                    }}
                  >
                    <Image source={getNetworkIcon(network)} style={styles.networkIcon} />
                    <Text style={styles.networkOptionText}>{getNetworkName(network)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safe Address</Text>
            <TextInput
              style={[styles.input, addressError ? styles.inputError : null]}
              placeholder="0x..."
              placeholderTextColor={colors.textTertiary}
              value={safeAddress}
              onChangeText={handleAddressChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {addressError ? <Text style={styles.errorText}>{addressError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safe Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a name for this Safe"
              placeholderTextColor={colors.textTertiary}
              value={safeName}
              onChangeText={setSafeName}
            />
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.importButton, importing && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.importButtonText}>Import Safe</Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  networkIcon: {
    width: 24,
    height: 24,
  },
  networkName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  networkPicker: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  networkOptionSelected: {
    backgroundColor: colors.cardDark,
  },
  networkOptionText: {
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
  importButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
