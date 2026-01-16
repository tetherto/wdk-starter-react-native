import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { getNetworkMode, NetworkMode } from '@/services/network-mode-service';
import { multisigService } from '@/services/multisig-service';
import { getMultisigNetworks, getMultisigNetworkConfig, MultisigNetworkType } from '@/config/multisig-config';
import { networkConfigs } from '@/config/networks';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { validateEvmAddress } from '@/utils/address-validators';
import { Plus, Trash2, Users, ChevronDown } from 'lucide-react-native';
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

export default function CreateSafeScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses, isInitialized } = useWallet({ walletId: currentWalletId });

  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');
  const [availableNetworks, setAvailableNetworks] = useState<MultisigNetworkType[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<MultisigNetworkType | null>(null);
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [safeName, setSafeName] = useState('');
  const [owners, setOwners] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState(1);
  const [creating, setCreating] = useState(false);
  const [myAddress, setMyAddress] = useState<string>('');

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

  useEffect(() => {
    if (selectedNetwork && addresses?.[selectedNetwork]?.[0]) {
      const addr = addresses[selectedNetwork][0];
      setMyAddress(addr);
      if (owners.length === 1 && owners[0] === '') {
        setOwners([addr]);
      }
    }
  }, [selectedNetwork, addresses]);

  const handleAddOwner = () => {
    setOwners([...owners, '']);
  };

  const handleRemoveOwner = (index: number) => {
    if (owners.length <= 1) return;
    const newOwners = owners.filter((_, i) => i !== index);
    setOwners(newOwners);
    if (threshold > newOwners.length) {
      setThreshold(newOwners.length);
    }
  };

  const handleOwnerChange = (index: number, value: string) => {
    const newOwners = [...owners];
    newOwners[index] = value;
    setOwners(newOwners);
  };

  const validateOwners = (): boolean => {
    const validOwners = owners.filter((o) => o.trim() !== '');
    if (validOwners.length < 1) {
      Alert.alert('Error', 'At least one owner is required');
      return false;
    }

    for (const owner of validOwners) {
      const result = validateEvmAddress(owner);
      if (!result.valid) {
        Alert.alert('Error', `Invalid address: ${owner.slice(0, 10)}...`);
        return false;
      }
    }

    const uniqueOwners = new Set(validOwners.map((o) => o.toLowerCase()));
    if (uniqueOwners.size !== validOwners.length) {
      Alert.alert('Error', 'Duplicate owner addresses found');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!selectedNetwork) {
      Alert.alert('Error', 'Please select a network');
      return;
    }

    if (!safeName.trim()) {
      Alert.alert('Error', 'Please enter a name for the Safe');
      return;
    }

    if (!validateOwners()) {
      return;
    }

    const validOwners = owners.filter((o) => o.trim() !== '');

    if (threshold < 1 || threshold > validOwners.length) {
      Alert.alert('Error', `Threshold must be between 1 and ${validOwners.length}`);
      return;
    }

    setCreating(true);

    try {
      const config = getMultisigNetworkConfig(selectedNetwork);

      const predictedAddress = `0x${Date.now().toString(16)}...pending`;

      await multisigService.addSafe({
        address: predictedAddress,
        network: selectedNetwork,
        name: safeName.trim(),
        owners: validOwners,
        threshold,
        createdAt: Date.now(),
      });

      toast.success('Safe created successfully!');
      router.back();
    } catch (error) {
      console.error('Failed to create safe:', error);
      Alert.alert('Error', 'Failed to create Safe. Please try again.');
    } finally {
      setCreating(false);
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
      <Header title="Create Safe" showBack />

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
            <Text style={styles.sectionTitle}>Safe Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter a name for your Safe"
              placeholderTextColor={colors.textTertiary}
              value={safeName}
              onChangeText={setSafeName}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Owners</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Add the addresses that will be able to sign transactions
            </Text>

            {owners.map((owner, index) => (
              <View key={index} style={styles.ownerRow}>
                <TextInput
                  style={[styles.input, styles.ownerInput]}
                  placeholder="0x..."
                  placeholderTextColor={colors.textTertiary}
                  value={owner}
                  onChangeText={(value) => handleOwnerChange(index, value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {owners.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveOwner(index)}
                  >
                    <Trash2 size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addOwnerButton} onPress={handleAddOwner}>
              <Plus size={20} color={colors.primary} />
              <Text style={styles.addOwnerText}>Add Owner</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Threshold</Text>
            <Text style={styles.sectionSubtitle}>
              Number of signatures required to execute transactions
            </Text>

            <View style={styles.thresholdSelector}>
              {Array.from({ length: owners.filter((o) => o.trim()).length || 1 }, (_, i) => i + 1).map(
                (num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.thresholdOption,
                      threshold === num && styles.thresholdOptionSelected,
                    ]}
                    onPress={() => setThreshold(num)}
                  >
                    <Text
                      style={[
                        styles.thresholdText,
                        threshold === num && styles.thresholdTextSelected,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <Text style={styles.thresholdInfo}>
              {threshold} of {owners.filter((o) => o.trim()).length || 1} owners required
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.createButton, creating && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.createButtonText}>Create Safe</Text>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ownerInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeButton: {
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  addOwnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addOwnerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  thresholdSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thresholdOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdOptionSelected: {
    backgroundColor: colors.primary,
  },
  thresholdText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  thresholdTextSelected: {
    color: colors.white,
  },
  thresholdInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
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
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
