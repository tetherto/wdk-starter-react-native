import React, { useState, useMemo, useCallback } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Search, ChevronDown, ChevronUp, Copy, EllipsisVertical, Plus, Hexagon, Triangle, Diamond, Circle } from 'lucide-react-native';
import { Screen, ScreenHeader, Text } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useAccounts } from '@/state/accounts';
import { useWdkTotalUsdForAccount, useWdkAddressForAccountNetwork } from '@/wdk/hooks/useWalletData';
import { useToast } from '@/state/toast';
import { usePendingRefresh, POLL_DELAYS_MS } from '@/state/pendingRefresh';

/**
 * Accounts — matches the prototype's `accounts` screen: search bar, a
 * collapsible "Wallet 1" section (this app has exactly one wallet — see
 * ARCHITECTURE.md's fixed-wallet-ID note — so this is a static label with
 * the prototype's collapse interaction, not real multi-wallet support),
 * account rows (icon, name, address chip, total balance, options menu),
 * and an "Add account" row.
 *
 * MULTI-ACCOUNT ARCHITECTURE: WDK has no built-in "list of accounts" —
 * useAccounts() (src/state/accounts.ts) is this app's own persisted state
 * for that. "Adding an account" is genuinely instant: no new seed, no WDK
 * call — just a new derivation index that WDK will derive real
 * addresses/balances for the moment anything asks. Tapping a row sets it
 * active and returns to Home, which will then show that account's own
 * balances across every configured network — this is the same
 * useWdkBalances()/useWdkAccount() Home already uses, since those now read
 * the active index from this same store.
 */
export default function Accounts() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { indices, activeIndex, names, setActive, addAccount } = useAccounts();
  const [query, setQuery] = useState('');
  const [walletExpanded, setWalletExpanded] = useState(true);

  const filteredIndices = useMemo(() => {
    if (!query.trim()) return indices;
    const q = query.trim().toLowerCase();
    return indices.filter((i) => (names[i] ?? `Account ${i + 1}`).toLowerCase().includes(q));
  }, [indices, names, query]);

  const onSelect = (index: number) => {
    setActive(index);
    router.back();
  };

  const onAdd = () => {
    addAccount();
    router.back();
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Accounts" onBack={() => router.back()} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: theme.colors.bgSecondary,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: moderateScale(14),
          marginBottom: 16,
        }}
      >
        <Search size={moderateScale(18)} color={theme.colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your accounts"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            paddingVertical: moderateScale(12),
            fontSize: moderateScale(15),
            color: theme.colors.textPrimary,
          }}
        />
      </View>

      <Pressable
        onPress={() => setWalletExpanded((v) => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: moderateScale(8),
          paddingBottom: moderateScale(10),
        }}
      >
        <Text variant="body" color="textSecondary" style={{ fontWeight: '500' }}>Wallet 1</Text>
        {walletExpanded ? (
          <ChevronUp size={moderateScale(16)} color={theme.colors.textSecondary} />
        ) : (
          <ChevronDown size={moderateScale(16)} color={theme.colors.textSecondary} />
        )}
      </Pressable>

      {walletExpanded && (
        <View>
          {filteredIndices.map((index, i) => (
            <AccountRow
              key={index}
              index={index}
              name={names[index] ?? `Account ${index + 1}`}
              isActive={index === activeIndex}
              isLast={i === filteredIndices.length - 1}
              onPress={() => onSelect(index)}
            />
          ))}

          <Pressable
            onPress={onAdd}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: moderateScale(14),
              marginTop: 4,
            }}
          >
            <View
              style={{
                width: moderateScale(40),
                height: moderateScale(40),
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.brandTint,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={moderateScale(22)} color={theme.colors.brand} />
            </View>
            <Text variant="body" color="brand" style={{ fontWeight: '700' }}>Add account</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

// A small, fixed palette cycling by account index — purely for visual
// distinction between accounts, not tied to anything functional.
// Taken directly from the prototype's own `extraAccounts` JS array — each
// account gets a DIFFERENT icon shape, not the same shape recolored. Cycles
// for accounts beyond the prototype's 4-item demo list (this app supports
// genuinely unlimited HD-derived accounts, unlike the prototype's capped
// demo).
const ACCOUNT_GLYPHS: { Icon: typeof Hexagon; bg: string; iconColor: string }[] = [
  { Icon: Hexagon, bg: '#8B9CF7', iconColor: '#171717' },
  { Icon: Triangle, bg: 'rgba(255,78,0,0.16)', iconColor: '#171717' },
  // The prototype's 3rd variant is "square-rotated" (a diamond). Using
  // Lucide's own Diamond icon directly, rather than rotating a Square —
  // rotating an icon 45° expands its bounding box by √2x, and since this
  // icon sits inside a borderRadius container (which RN clips children
  // against by default), the rotated corners were getting cut off, leaving
  // only a stray fragment visible. A dedicated Diamond icon has no such
  // problem — its shape is already correct within its own bounding box.
  { Icon: Diamond, bg: 'rgba(255,78,0,0.16)', iconColor: '#171717' },
  { Icon: Circle, bg: '#FDE68A', iconColor: '#92400E' },
];

function AccountRow({
  index,
  name,
  isActive,
  isLast,
  onPress,
}: {
  index: number;
  name: string;
  isActive: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { total, refetch } = useWdkTotalUsdForAccount(index);

  // Same fix as Home — force a fresh fetch for THIS account's own balance
  // whenever the Accounts screen regains focus (e.g. right after a send),
  // rather than trusting the query's own staleTime timer.
  const sendPending = usePendingRefresh((s) => s.pending);

  useFocusEffect(
    useCallback(() => {
      refetch();

      if (!sendPending) return;

      // Same reasoning as Home — a send just completed, and THIS row might
      // be the recipient, which has no navigation event of its own to react
      // to at all. Poll for a short window to catch the actual confirmation.
      const timers = POLL_DELAYS_MS.map((delay) => setTimeout(() => refetch(), delay));
      return () => timers.forEach(clearTimeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, sendPending]),
  );
  // Representative address: Ethereum's, since the same address works
  // across every EVM network this app supports (Ethereum/Arbitrum/Polygon
  // all share one address per account) — a more useful "primary identifier"
  // than Bitcoin's, which is chain-specific.
  const { address } = useWdkAddressForAccountNetwork(index, 'ethereum');
  const glyph = ACCOUNT_GLYPHS[index % ACCOUNT_GLYPHS.length];
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-5)}` : '—';

  const onCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    useToast.getState().show('Address copied');
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: moderateScale(12),
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: theme.colors.border,
        },
        isActive && {
          backgroundColor: theme.colors.brandTint,
          marginHorizontal: -12,
          paddingHorizontal: 12,
          borderRadius: theme.radii.md,
          borderBottomWidth: 0,
        },
      ]}
    >
      <View
        style={{
          width: moderateScale(40),
          height: moderateScale(40),
          borderRadius: theme.radii.md,
          backgroundColor: glyph.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <glyph.Icon size={moderateScale(20)} color={glyph.iconColor} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="label" style={{ fontWeight: '500' }}>{name}</Text>
        <Pressable
          onPress={onCopy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            alignSelf: 'flex-start',
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.bgSecondary,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Text variant="small" mono color="textSecondary">{shortAddress}</Text>
          <Copy size={moderateScale(12)} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <Text variant="label" style={{ fontWeight: '500' }}>{total}</Text>

      <Pressable
        onPress={() => useToast.getState().show('Account options')}
        style={{
          width: moderateScale(32),
          height: moderateScale(32),
          borderRadius: moderateScale(10),
          backgroundColor: theme.colors.bgSecondary,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EllipsisVertical size={moderateScale(16)} color={theme.colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}
