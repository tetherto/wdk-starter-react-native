import Header from '@/components/header';
import { colors } from '@/constants/colors';
import { multisigService, StoredSafe } from '@/services/multisig-service';
import { MultisigNetworkType } from '@/config/multisig-config';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Copy, Plus, Trash2, Users, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import * as Clipboard from 'expo-clipboard';
import { validateEvmAddress } from '@/utils/address-validators';

export default function OwnersScreen() {
  const insets = useSafeAreaInsets();
  const { address, network } = useLocalSearchParams<{ address: string; network: MultisigNetworkType }>();

  const [safe, setSafe] = useState<StoredSafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newOwnerError, setNewOwnerError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadSafeData = useCallback(async () => {
    if (!address || !network) return;

    setLoading(true);
    try {
      const safeData = await multisigService.getSafe(address, network);
      setSafe(safeData);
    } catch (error) {
      console.error('Failed to load safe data:', error);
    } finally {
      setLoading(false);
    }
  }, [address, network]);

  useFocusEffect(
    useCallback(() => {
      loadSafeData();
    }, [loadSafeData])
  );

  const handleCopyAddress = async (addr: string) => {
    await Clipboard.setStringAsync(addr);
    toast.success('Address copied');
  };

  const handleNewOwnerChange = (value: string) => {
    setNewOwnerAddress(value);
    if (value.trim()) {
      const result = validateEvmAddress(value.trim());
      setNewOwnerError(result.valid ? '' : result.error);
    } else {
      setNewOwnerError('');
    }
  };

  const handleAddOwner = async () => {
    if (!newOwnerAddress.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    const result = validateEvmAddress(newOwnerAddress.trim());
    if (!result.valid) {
      Alert.alert('Error', result.error);
      return;
    }

    if (safe?.owners.some((o) => o.toLowerCase() === newOwnerAddress.trim().toLowerCase())) {
      Alert.alert('Error', 'This address is already an owner');
      return;
    }

    setActionLoading(true);
    try {
      toast.success('Add owner proposal created');
      setShowAddOwner(false);
      setNewOwnerAddress('');
    } catch (error) {
      console.error('Failed to add owner:', error);
      Alert.alert('Error', 'Failed to create add owner proposal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveOwner = (ownerAddress: string) => {
    if ((safe?.owners.length || 0) <= 1) {
      Alert.alert('Error', 'Cannot remove the last owner');
      return;
    }

    Alert.alert(
      'Remove Owner',
      `Are you sure you want to propose removing this owner?\n\n${ownerAddress.slice(0, 10)}...${ownerAddress.slice(-8)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              toast.success('Remove owner proposal created');
            } catch (error) {
              console.error('Failed to remove owner:', error);
              Alert.alert('Error', 'Failed to create remove owner proposal');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeThreshold = () => {
    const maxThreshold = safe?.owners.length || 1;
    const options = Array.from({ length: maxThreshold }, (_, i) => ({
      text: `${i + 1} of ${maxThreshold}`,
      onPress: async () => {
        if (i + 1 === safe?.threshold) return;
        setActionLoading(true);
        try {
          toast.success('Change threshold proposal created');
        } catch (error) {
          console.error('Failed to change threshold:', error);
          Alert.alert('Error', 'Failed to create change threshold proposal');
        } finally {
          setActionLoading(false);
        }
      },
    }));

    Alert.alert('Change Threshold', 'Select new threshold:', [
      ...options,
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Owners" showBack />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header
        title="Owners"
        showBack
        rightElement={
          <TouchableOpacity onPress={loadSafeData}>
            <RefreshCw size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.thresholdCard}>
          <View style={styles.thresholdInfo}>
            <Users size={24} color={colors.primary} />
            <View style={styles.thresholdText}>
              <Text style={styles.thresholdLabel}>Signature Threshold</Text>
              <Text style={styles.thresholdValue}>
                {safe?.threshold || 0} of {safe?.owners.length || 0}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.changeButton} onPress={handleChangeThreshold}>
            <Text style={styles.changeButtonText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Owners ({safe?.owners.length || 0})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddOwner(!showAddOwner)}
            >
              <Plus size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {showAddOwner && (
            <View style={styles.addOwnerCard}>
              <TextInput
                style={[styles.input, newOwnerError ? styles.inputError : null]}
                placeholder="Enter owner address (0x...)"
                placeholderTextColor={colors.textTertiary}
                value={newOwnerAddress}
                onChangeText={handleNewOwnerChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {newOwnerError ? <Text style={styles.errorText}>{newOwnerError}</Text> : null}
              <TouchableOpacity
                style={[styles.confirmAddButton, actionLoading && styles.buttonDisabled]}
                onPress={handleAddOwner}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.confirmAddButtonText}>Propose Add Owner</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.ownersList}>
            {safe?.owners.map((owner, index) => (
              <View key={owner} style={styles.ownerCard}>
                <View style={styles.ownerInfo}>
                  <Text style={styles.ownerIndex}>#{index + 1}</Text>
                  <Text style={styles.ownerAddress}>{formatAddress(owner)}</Text>
                </View>
                <View style={styles.ownerActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleCopyAddress(owner)}
                  >
                    <Copy size={18} color={colors.primary} />
                  </TouchableOpacity>
                  {(safe?.owners.length || 0) > 1 && (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleRemoveOwner(owner)}
                    >
                      <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Owner Management</Text>
          <Text style={styles.infoText}>
            Adding or removing owners, and changing the threshold requires approval from the
            current owners through the multisig process.
          </Text>
        </View>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
  },
  thresholdInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thresholdText: {
    gap: 2,
  },
  thresholdLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  thresholdValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  changeButton: {
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  addButton: {
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 8,
  },
  addOwnerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.cardDark,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 12,
  },
  confirmAddButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  ownersList: {
    gap: 8,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerIndex: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textTertiary,
    width: 24,
  },
  ownerAddress: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: colors.text,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    backgroundColor: colors.cardDark,
    borderRadius: 8,
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
});
