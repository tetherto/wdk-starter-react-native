import { useWalletSwitcher } from '@/hooks/use-wallet-switcher';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { Wallet, Plus, Check, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import avatarOptions from '@/config/avatar-options';
import { colors } from '@/constants/colors';
import { toast } from 'sonner-native';
import getErrorMessage from '@/utils/get-error-message';

export default function WalletSwitcherSheet() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { isOpen, wallets, activeWallet, isSwitchingWallet, switchWallet, close } =
    useWalletSwitcher();
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const [optimisticActiveId, setOptimisticActiveId] = useState<string | undefined>(
    activeWallet?.id
  );
  // Update sheet when isOpen changes
  React.useEffect(() => {
    if (isOpen) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setOptimisticActiveId(activeWallet?.id);
    }
  }, [activeWallet?.id, isOpen]);

  const snapPoints = useMemo(() => ['70%', '92%'], []);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        close();
      }
    },
    [close]
  );

  const handleSelectWallet = useCallback(
    async (walletId: string) => {
      try {
        if (isSwitchingWallet) return;
        setOptimisticActiveId(walletId);
        bottomSheetModalRef.current?.dismiss();
        close();
        await switchWallet(walletId);
      } catch (error) {
        console.error('[wallet-switcher] failed to switch wallet', error);
        toast.error(getErrorMessage(error, 'Unable to switch wallet. Please try again.'));
      }
    },
    [close, isSwitchingWallet, switchWallet]
  );

  const handleCreateWallet = useCallback(() => {
    close();
    router.push('/wallet-setup/name-wallet');
  }, [close, router]);

  const handleImportWallet = useCallback(() => {
    close();
    router.push('/wallet-setup/import-wallet');
  }, [close, router]);

  const walletList = useMemo(() => wallets ?? [], [wallets]);

  const getAvatarOption = useCallback((avatarId?: number) => {
    return avatarOptions.find((option) => option.id === avatarId) ?? avatarOptions[0];
  }, []);

  const getAddressPreview = useCallback(
    (wallet: { address?: string; addresses?: Record<string, string> }) => {
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
    },
    []
  );

  const renderWallet = useCallback(
    ({
      item,
      index,
    }: {
      item: { id: string; name: string; address?: string; avatarId?: number };
      index: number;
    }) => {
      const isActive = item.id === (optimisticActiveId ?? activeWallet?.id);
      const isSwitchDisabled = walletList.length <= 1;
      const avatarOption = getAvatarOption(item.avatarId);
      const addressPreview = getAddressPreview(item);
      const [addressLabel, addressValue] = addressPreview.includes(': ')
        ? addressPreview.split(': ')
        : [undefined, addressPreview];

      return (
        <TouchableOpacity
          style={[
            styles.walletRow,
            isActive && styles.walletRowActive,
            index === walletList.length - 1 && styles.walletRowLast,
          ]}
          onPress={() => {
            if (!isSwitchDisabled && !isActive) {
              handleSelectWallet(item.id);
            }
          }}
          activeOpacity={isSwitchDisabled || isActive ? 1 : 0.7}
        >
          <View style={styles.walletContent}>
            <View style={styles.walletMeta}>
              <View style={[styles.walletAvatar, { backgroundColor: avatarOption.color }]}>
                <Text style={styles.walletAvatarText}>{avatarOption.emoji}</Text>
              </View>
              <View style={styles.walletText}>
                <View style={styles.walletTitleRow}>
                  <Text style={styles.walletName} numberOfLines={1} ellipsizeMode="tail">
                    {item.name}
                  </Text>
                  {isActive ? (
                    <View style={styles.activeBadgeInline}>
                      <Check size={14} color={colors.black} />
                      <Text style={styles.activeLabel}>Active</Text>
                    </View>
                  ) : null}
                </View>
                {addressLabel ? (
                  <Text style={styles.walletAddressLabel}>{addressLabel}</Text>
                ) : null}
                <Text style={styles.walletAddressValue}>{addressValue}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionSlot}>
            {isActive ? null : <ChevronRight size={18} color={colors.textTertiary} />}
          </View>
        </TouchableOpacity>
      );
    },
    [
      activeWallet?.id,
      getAddressPreview,
      getAvatarOption,
      handleSelectWallet,
      optimisticActiveId,
      walletList.length,
    ]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      )}
    >
      <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Wallet size={20} color={colors.primary} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Select Wallet</Text>
              <Text style={styles.subtitle}>Tap a wallet to switch</Text>
            </View>
          </View>
        </View>

          <View style={styles.walletsList}>
          <FlatList
            data={walletList as { id: string; name: string; address?: string; avatarId?: number }[]}
            renderItem={renderWallet}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No wallets found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap “Import Wallet” or “Create Wallet” to get started
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footerActions}>
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
            }
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.card,
  },
  handleIndicator: {
    backgroundColor: colors.border,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  walletsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    minHeight: 76,
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  walletRowActive: {
    backgroundColor: colors.tintedBackground,
    borderColor: colors.primary,
  },
  walletRowLast: {
    marginBottom: 0,
  },
  walletContent: {
    flex: 1,
    marginRight: 12,
  },
  walletMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  walletAvatarText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  walletText: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  walletAddressLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  walletAddressValue: {
    fontSize: 12,
    color: colors.textTertiary,
    lineHeight: 16,
    marginTop: 2,
  },
  actionSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  activeBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.black,
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
  },
  footerActions: {
    marginTop: 16,
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
