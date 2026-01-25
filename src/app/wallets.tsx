import Header from '@/components/header';
import { useWalletSwitcher } from '@/hooks/use-wallet-switcher';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatList, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet, Plus } from 'lucide-react-native';
import { colors } from '@/constants/colors';

export default function WalletsScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWallet, switchWallet } = useWalletSwitcher();

  const getAddressPreview = (wallet: { address?: string; addresses?: Record<string, string> }) => {
    const entries = wallet.addresses
      ? Object.entries(wallet.addresses).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string' && !!entry[1]
        )
      : [];
    if (entries.length > 0) {
      const priority = ['bitcoin', 'ethereum', 'polygon', 'arbitrum', 'ton'];
      const sorted = entries.sort(([left], [right]) => {
        const leftIndex = priority.indexOf(left);
        const rightIndex = priority.indexOf(right);
        if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      });
      const [label, value] = sorted[0];
      return `${label.toUpperCase()}: ${value}`;
    }
    return wallet.address ? wallet.address : 'No address';
  };

  const handleSelect = async (walletId: string) => {
    await switchWallet(walletId);
    router.back();
  };

  const handleCreateWallet = () => {
    router.push('/wallet-setup/name-wallet');
  };

  const handleImportWallet = () => {
    router.push('/wallet-setup/import-wallet');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Wallets" />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Wallet size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>All Wallets</Text>
        </View>

        <View style={styles.card}>
          <FlatList
            data={wallets}
            renderItem={({ item, index }) => {
              const isActive = item.id === activeWallet?.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, index === wallets.length - 1 && styles.rowLast]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowContent}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.address}>{getAddressPreview(item)}</Text>
                  </View>

                  {isActive && <Text style={styles.active}>Active</Text>}
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No wallets found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Create or import a wallet to get started
                </Text>
              </View>
            }
            />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.secondaryActionButton}
          onPress={handleImportWallet}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryActionText}>Import Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={handleCreateWallet}
          activeOpacity={0.7}
        >
          <Plus size={18} color={colors.black} />
          <Text style={styles.primaryActionText}>Create Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Section */
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },

  /* Card */
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },

  /* Rows */
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },

  /* Text */
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    flexWrap: 'wrap',
  },
  active: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  secondaryActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
