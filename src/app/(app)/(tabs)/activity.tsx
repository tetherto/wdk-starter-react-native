import React, { useState, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, Check, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Screen, Text, EmptyState, LoadingState, ErrorState, AssetIcon } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkTransactions } from '@/wdk/hooks/useWalletData';
import { networkColor } from '@/wdk/hooks/useWalletData';
import { ASSETS } from '@/wdk/assets';
import type { Transaction, ChainId } from '@/domain/models';

/**
 * Activity — matches the prototype's `activity` screen: three filter pills
 * (chain/token/type), date-grouped transaction list (Today/Yesterday/
 * Earlier), tap-through to transaction detail.
 *
 * Real data via useWdkTransactions() (the WDK Indexer API) — see
 * wdk/indexer.ts for two honest, real limitations this screen inherits:
 * native ETH has no transaction history available at all (excluded from
 * results, not silently shown as empty), and this requires a real,
 * registered indexer API key to return anything.
 */

type ChainFilter = 'all' | 'ethereum' | 'arbitrum' | 'polygon' | 'bitcoin';
type TokenFilter = 'all' | string; // lowercased symbol, e.g. 'usdt', 'usdt0', 'eth', 'btc'
type TypeFilter = 'all' | 'sent' | 'received';

const CHAIN_OPTIONS: { key: ChainFilter; label: string }[] = [
  { key: 'all', label: 'All chains' },
  { key: 'ethereum', label: 'Ethereum' },
  { key: 'arbitrum', label: 'Arbitrum' },
  { key: 'polygon', label: 'Polygon' },
  { key: 'bitcoin', label: 'Bitcoin' },
];
const TYPE_OPTIONS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All types' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

/**
 * Token options are DERIVED from the actual asset list, not a hardcoded
 * static array — real bug this fixes: the previous version showed every
 * token (BTC/ETH/USDT) regardless of which chain was selected, so picking
 * "Ethereum" + "BTC" together was a nonsensical combination that doesn't
 * exist anywhere in this app (there's no BTC on Ethereum). Now the token
 * list only ever shows symbols that genuinely exist on whichever chain is
 * currently selected — "All chains" shows every distinct symbol across the
 * whole app, a specific chain shows only that chain's real tokens.
 */
function getValidTokenOptions(chain: ChainFilter): { key: TokenFilter; label: string }[] {
  const relevant = chain === 'all' ? ASSETS : ASSETS.filter((a) => a.getNetwork() === chain);
  const symbols = Array.from(new Set(relevant.map((a) => a.getSymbol())));
  return [
    { key: 'all', label: 'All tokens' },
    ...symbols.map((s) => ({ key: s.toLowerCase(), label: s })),
  ];
}

function groupLabel(timestamp: number): string {
  const now = new Date();
  const d = new Date(timestamp);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-3)}`;
}

export default function Activity() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const tx = useWdkTransactions();

  const [openFilter, setOpenFilter] = useState<'chain' | 'token' | 'type' | null>(null);
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const tokenOptions = useMemo(() => getValidTokenOptions(chainFilter), [chainFilter]);

  const onSelectChain = (key: ChainFilter) => {
    setChainFilter(key);
    setOpenFilter(null);
    // If the currently-selected token doesn't exist on the newly-selected
    // chain, reset it rather than silently keep an invalid combination
    // (e.g. "Ethereum" + "BTC", which matches nothing in this app).
    const stillValid = getValidTokenOptions(key).some((o) => o.key === tokenFilter);
    if (!stillValid) setTokenFilter('all');
  };

  const filtered = useMemo(() => {
    return tx.data.filter((t) => {
      if (chainFilter !== 'all' && t.token.chain !== chainFilter) return false;
      if (tokenFilter !== 'all' && t.token.symbol.toLowerCase() !== tokenFilter) return false;
      if (typeFilter !== 'all') {
        const wanted = typeFilter === 'sent' ? 'out' : 'in';
        if (t.direction !== wanted) return false;
      }
      return true;
    });
  }, [tx.data, chainFilter, tokenFilter, typeFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const label = groupLabel(t.timestamp);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(t);
    });
    const order = ['Today', 'Yesterday', 'Earlier'];
    return order.filter((o) => map.has(o)).map((label) => ({ label, items: map.get(label)! }));
  }, [filtered]);

  return (
    <Screen scroll edges={['top']}>
      <Text variant="h1" style={{ marginBottom: 16 }}>Activity</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
        <FilterPill
          label={CHAIN_OPTIONS.find((o) => o.key === chainFilter)!.label}
          active={chainFilter !== 'all'}
          isOpen={openFilter === 'chain'}
          onPress={() => setOpenFilter(openFilter === 'chain' ? null : 'chain')}
        />
        <FilterPill
          label={tokenOptions.find((o) => o.key === tokenFilter)?.label ?? 'All tokens'}
          active={tokenFilter !== 'all'}
          isOpen={openFilter === 'token'}
          onPress={() => setOpenFilter(openFilter === 'token' ? null : 'token')}
        />
        <FilterPill
          label={TYPE_OPTIONS.find((o) => o.key === typeFilter)!.label}
          active={typeFilter !== 'all'}
          isOpen={openFilter === 'type'}
          onPress={() => setOpenFilter(openFilter === 'type' ? null : 'type')}
        />
      </View>

      {openFilter === 'chain' && (
        <FilterDropdown
          options={CHAIN_OPTIONS}
          selected={chainFilter}
          onSelect={(k) => onSelectChain(k as ChainFilter)}
        />
      )}
      {openFilter === 'token' && (
        <FilterDropdown
          options={tokenOptions}
          selected={tokenFilter}
          onSelect={(k) => { setTokenFilter(k as TokenFilter); setOpenFilter(null); }}
        />
      )}
      {openFilter === 'type' && (
        <FilterDropdown
          options={TYPE_OPTIONS}
          selected={typeFilter}
          onSelect={(k) => { setTypeFilter(k as TypeFilter); setOpenFilter(null); }}
        />
      )}

      {tx.isLoading ? (
        <LoadingState message="Loading activity" />
      ) : tx.isError ? (
        <ErrorState
          message={tx.error?.message ?? "Couldn't load activity. Please try again."}
          onRetry={() => { tx.refetch(); }}
        />
      ) : groups.length === 0 ? (
        <Text variant="body" color="textSecondary" style={{ textAlign: 'center', paddingVertical: 32 }}>
          {tx.data.length === 0 ? 'No activity yet' : 'No transactions match these filters'}
        </Text>
      ) : (
        groups.map((group) => (
          <View key={group.label}>
            <Text variant="small" color="textSecondary" style={{ marginTop: 14, marginBottom: 4 }}>
              {group.label}
            </Text>
            {group.items.map((t) => (
              <TxRow key={t.id} tx={t} onPress={() => router.push(`/tx/${t.id}`)} />
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

function FilterPill({
  label,
  active,
  isOpen,
  onPress,
}: {
  label: string;
  active: boolean;
  isOpen: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const on = active || isOpen;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: theme.radii.lg,
        backgroundColor: on ? theme.colors.brandTint : theme.colors.bgSecondary,
        borderWidth: 1,
        borderColor: on ? 'transparent' : theme.colors.border,
      }}
    >
      <Text variant="small" color={on ? 'brand' : 'textPrimary'} style={{ fontWeight: '500' }}>
        {label}
      </Text>
      <ChevronDown
        size={moderateScale(13)}
        color={on ? theme.colors.brand : theme.colors.textSecondary}
        style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
      />
    </Pressable>
  );
}

function FilterDropdown<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  return (
    <View
      style={{
        marginBottom: 10,
        backgroundColor: theme.colors.bgSecondary,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 6,
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.key === selected;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 10,
              borderRadius: theme.radii.md,
              backgroundColor: isSelected ? theme.colors.brandTint : 'transparent',
            }}
          >
            <Text variant="body">{opt.label}</Text>
            {isSelected && <Check size={moderateScale(16)} color={theme.colors.brand} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function TxRow({ tx, onPress }: { tx: Transaction; onPress: () => void }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const isOut = tx.direction === 'out';
  const verb = isOut ? 'Sent' : 'Received';
  const chainName = tx.token.chain[0].toUpperCase() + tx.token.chain.slice(1);
  const chainColor = networkColor[tx.token.chain] ?? theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          width: moderateScale(36),
          height: moderateScale(36),
          borderRadius: moderateScale(18),
          backgroundColor: theme.colors.bgSecondary,
          borderWidth: 1,
          borderColor: theme.colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isOut ? (
          <ArrowUpRight size={moderateScale(16)} color={theme.colors.textSecondary} />
        ) : (
          <ArrowDownLeft size={moderateScale(16)} color={theme.colors.success} />
        )}
        <View
          style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: moderateScale(16),
            height: moderateScale(16),
            borderRadius: moderateScale(8),
            backgroundColor: chainColor,
            borderWidth: 2,
            borderColor: theme.colors.bgPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: moderateScale(8),
              // Explicit, generous lineHeight — same real fix as the
              // Review screen's hero amount text: without this, small bold
              // glyphs can render with their bottom clipped and sit
              // visually high in their box, since the default line-height
              // doesn't reliably match the font's actual rendered bounds,
              // especially noticeable at very small sizes like this.
              lineHeight: moderateScale(8) * 1.4,
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
            }}
          >
            {chainName[0]}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="body" style={{ fontWeight: '500' }}>{verb} {tx.token.symbol}</Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
          {chainName} · {isOut ? 'to' : 'from'} {shortAddress(tx.address)} · {timeAgo(tx.timestamp)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="body" color={isOut ? 'textPrimary' : 'success'} style={{ fontWeight: '500' }}>
          {isOut ? '-' : '+'}{tx.fiatValue}
        </Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
          {tx.amount} {tx.token.symbol}
        </Text>
      </View>
    </Pressable>
  );
}
