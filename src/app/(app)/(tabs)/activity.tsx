import React, { useState, useMemo } from 'react';
import { View, Pressable, Image, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, Check, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { Screen, Text, EmptyState, LoadingState, ErrorState, AssetIcon, Card, Button } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkTransactions } from '@/wdk/hooks/useWalletData';
import { networkColorFor, networkDisplayName, ALL_NETWORKS } from '@/wdk/chains';
import type { NetworkId } from '@/wdk/chains';
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

// Derived from the registry's NetworkId (itself derived from NETWORKS in
// wdk/networks.ts), not a hand-copied list of chain names — adding or
// removing a network there now updates this filter's type automatically,
// with no separate literal list here to fall out of sync.
type ChainFilter = 'all' | NetworkId;
type TokenFilter = 'all' | string; // lowercased symbol, e.g. 'usdt', 'usdt0', 'eth', 'btc'
type TypeFilter = 'all' | 'sent' | 'received';

// Same real logo asset used on Welcome/Unlock — not a fabricated "WDK"
// text placeholder. Its actual aspect ratio is wide (2.7:1), not square —
// same constant used on those screens, so this stays visually consistent
// with how the logo is sized everywhere else it appears, rather than
// forcing it into an arbitrary square box.
const LOGO_ASPECT_RATIO = 2.7;
const LOGO_MAX_WIDTH = 360;

const CHAIN_OPTIONS: { key: ChainFilter; label: string }[] = [
  { key: 'all', label: 'All chains' },
  ...ALL_NETWORKS.map((network) => ({ key: network, label: networkDisplayName(network) })),
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
  const { wp, moderateScale } = useResponsive();
  const tx = useWdkTransactions();
  const logoWidth = Math.min(wp(40), LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;
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
        tx.error?.message?.includes('wdk-api.tether.io/register') ? (
          // Uplifted per direct design feedback: the original version was
          // plain text against an empty background, and worded like a
          // genuine error ("Something went wrong") for something that's
          // actually an expected, common state in a fresh checkout of this
          // starter app — not a bug. Reassures first ("your wallet is
          // working normally"), then explains what's missing, with the
          // technical env var name isolated in its own card rather than
          // run into the sentence, and real WDK branding per the explicit
          // ask for this to "pop" more.
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 }}>
            {/* No background box — just the real logo, matching how it
                appears unadorned on Welcome/Unlock, per direct feedback. */}
            <Image
              source={require('@/../assets/images/wdk-logo.png')}
              style={{ width: logoWidth, height: logoHeight, alignSelf: 'center', marginBottom: 24 }}
              resizeMode="contain"
            />

            <Text variant="h1" style={{ textAlign: 'center', fontSize: moderateScale(22) }}>
              Transaction history
            </Text>
            <Text
              variant="body"
              color="brand"
              style={{ fontWeight: '600', marginTop: 6, fontSize: moderateScale(16), marginBottom: 20}}
            >
              Powered by the WDK Indexer Service
            </Text>
            <Text
              variant="body"
              color="textSecondary"
              style={{ textAlign: 'center', marginTop: 14, paddingHorizontal: 8, fontSize: moderateScale(14), lineHeight: moderateScale(22), marginBottom: 10 }}
            >
              Your wallet is working normally. Transaction history is available once a
              WDK Indexer API Key has been configured.
            </Text>

            <Card style={{ width: '100%', marginTop: 22 }}>
              <Text variant="small" color="textSecondary" style={{ fontSize: moderateScale(14) }}>
                Missing configuration
              </Text>
              <Text variant="mono" mono style={{ marginTop: 4, fontSize: moderateScale(14) }}>
                EXPO_PUBLIC_WDK_INDEXER_API_KEY
              </Text>
            </Card>

            <Text
              variant="body"
              color="brand"
              style={{ fontWeight: '600', marginTop: 22, fontSize: moderateScale(16) }}
              onPress={() => Linking.openURL('https://wdk-api.tether.io/register')}
            >
              Register for a free API key ↗
            </Text>

            <View style={{ width: '100%', marginTop: 26 }}>
              <Button label="Try Again" onPress={() => { tx.refetch(); }} />
            </View>
          </View>
        ) : (
          <ErrorState
            message={tx.error?.message ?? "Couldn't load activity. Please try again."}
            onRetry={() => { tx.refetch(); }}
          />
        )
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
  const chainName = networkDisplayName(tx.token.chain);
  const chainColor = networkColorFor(tx.token.chain) ?? theme.colors.textSecondary;

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
