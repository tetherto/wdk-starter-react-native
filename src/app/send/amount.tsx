import React, { useState, useMemo } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BigNumber from 'bignumber.js';
import { ScanLine, ArrowUpDown } from 'lucide-react-native';
import { validateBitcoinAddress, validateEVMAddress } from '@tetherto/wdk-utils';
import { Screen, ScreenHeader, Text, Card, Pill, Button } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWdkBalances } from '@/wdk/hooks/useWalletData';
import { usePrices } from '@/wdk/pricing';
import { ASSETS } from '@/wdk/assets';
import { useToast } from '@/state/toast';

type AmountMode = 'crypto' | 'fiat';

/**
 * Send — amount. Matches the prototype's `send-amount` screen: a "To" card
 * (address entry + Scan, "coming soon" per Phase 1 scope), a large centered
 * amount input with a crypto/fiat toggle and live conversion, an "Available"
 * row with a working Max button, bottom-pinned Review.
 *
 * Address validation: per the PRD ("Use the address validation helpers in
 * @tetherto/wdk-utils to sense-check addresses"), using the real
 * validateBitcoinAddress/validateEVMAddress — not a hand-rolled regex.
 * Network-aware: Bitcoin gets its own validator; Ethereum/Arbitrum/Polygon
 * all share the same EVM address format, so one validator covers all three.
 */
export default function SendAmount() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { tokenId } = useLocalSearchParams<{ tokenId: string }>();

  const asset = ASSETS.find((a) => a.getId() === tokenId);
  const balances = useWdkBalances();
  const balanceRow = balances.data.find((b) => b.token.id === tokenId);
  const { prices } = usePrices(asset ? [asset.getSymbol()] : []);
  const price = asset ? prices[asset.getSymbol()] : null;

  const [recipient, setRecipient] = useState('');
  const [mode, setMode] = useState<AmountMode>('crypto');
  // The ONE source of truth, always in crypto units, at full precision.
  // Toggling modes NEVER writes to this — only typing does. This is the fix
  // for a real bug: an earlier version re-derived this value from whatever
  // was currently displayed every time the mode was toggled, which meant
  // toggling crypto -> fiat -> crypto silently lost precision (rounding to
  // 2dp for the fiat display, then converting back FROM that already-
  // rounded number) — e.g. 10 USDT could silently become 9.996438 USDT
  // after two toggles, with no typing in between, purely from switching
  // views back and forth.
  const [canonicalCrypto, setCanonicalCrypto] = useState<BigNumber | null>(null);
  // What's actually shown/edited in the big input right now — may be a
  // rounded DISPLAY of canonicalCrypto, but is never itself fed back into
  // canonicalCrypto except when the person is directly typing.
  const [inputText, setInputText] = useState('');

  const addressCheck = useMemo(() => {
    if (!recipient.trim() || !asset) return null;
    return asset.getNetwork() === 'bitcoin'
      ? validateBitcoinAddress(recipient.trim())
      : validateEVMAddress(recipient.trim());
  }, [recipient, asset]);

  const cryptoAmount = canonicalCrypto ?? new BigNumber(0);
  const fiatAmount = price ? cryptoAmount.multipliedBy(price) : null;

  /**
   * Strips anything that isn't a digit or a decimal point — covers input
   * from ANY source (on-screen keyboard, pasting, a physical/bluetooth
   * keyboard, voice-to-text), not just what keyboardType="decimal-pad"
   * restricts (which only limits which KEYS are shown, not what actually
   * lands in the field). Also collapses multiple dots down to just the
   * first one, so pasting something like "1.2.3" doesn't produce an
   * unparseable value.
   */
  function sanitizeAmountInput(text: string): string {
    const digitsAndDots = text.replace(/[^0-9.]/g, '');
    const firstDot = digitsAndDots.indexOf('.');
    if (firstDot === -1) return digitsAndDots;
    return digitsAndDots.slice(0, firstDot + 1) + digitsAndDots.slice(firstDot + 1).replace(/\./g, '');
  }

  const onChangeAmount = (rawText: string) => {
    const text = sanitizeAmountInput(rawText);
    setInputText(text);
    // BigNumber's constructor THROWS on invalid input (empty string, "abc",
    // a bare "." or "-") rather than returning a graceful NaN value — it
    // never gets as far as an .isNaN() check we could rely on. This is
    // exactly what crashed when deleting the amount down to empty, or
    // typing a non-numeric character: the exception happened on the very
    // line constructing `n`, before any validation logic could run.
    let n: BigNumber;
    try {
      n = new BigNumber(text);
    } catch {
      setCanonicalCrypto(null);
      return;
    }
    if (n.isNaN()) {
      setCanonicalCrypto(null);
      return;
    }
    // Typing is the ONLY time canonicalCrypto is recalculated — and it's
    // always derived directly from the raw typed text, at full precision,
    // never from a previously-rounded display value.
    setCanonicalCrypto(mode === 'crypto' ? n : (price ? n.dividedBy(price) : null));
  };

  const availableCrypto = balanceRow ? new BigNumber(balanceRow.amount) : new BigNumber(0);
  const hasEnoughBalance = cryptoAmount.isLessThanOrEqualTo(availableCrypto);
  const canReview = !!addressCheck?.success && cryptoAmount.isGreaterThan(0) && hasEnoughBalance;

  const toggleMode = () => {
    if (!price) {
      useToast.getState().show('Price unavailable for conversion');
      return;
    }
    // Only changes what's DISPLAYED — canonicalCrypto itself is untouched,
    // so toggling back and forth any number of times, with no typing in
    // between, always recovers the exact original amount.
    if (mode === 'crypto') {
      setInputText(cryptoAmount.multipliedBy(price).toFixed(2));
      setMode('fiat');
    } else {
      setInputText(cryptoAmount.toFixed(asset?.getDecimals() ?? 8));
      setMode('crypto');
    }
  };

  const onMax = () => {
    setCanonicalCrypto(availableCrypto);
    if (mode === 'crypto') {
      setInputText(availableCrypto.toFixed(asset?.getDecimals() ?? 8));
    } else if (price) {
      setInputText(availableCrypto.multipliedBy(price).toFixed(2));
    }
  };

  const onReview = () => {
    if (!canReview || !asset) return;
    router.push({
      pathname: '/send/review',
      params: {
        tokenId: asset.getId(),
        recipient: recipient.trim(),
        amount: cryptoAmount.toFixed(asset.getDecimals()),
      },
    });
  };

  if (!asset) {
    return (
      <Screen>
        <ScreenHeader title="Send" onBack={() => router.back()} />
        <Text variant="body" color="error">Unknown asset.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title={`Send ${asset.getSymbol()}`} onBack={() => router.back()} />

      {/* "To" card */}
      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="small" color="textSecondary">To</Text>
          <Pressable
            onPress={() => {useToast.getState().show('Scan coming soon')}}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 , zIndex:100}}
          >
            <ScanLine size={moderateScale(14)} color={theme.colors.brand} />
            <Text variant="body" color="brand" style={{ fontWeight: '500' }}>Scan</Text>
          </Pressable>
        </View>
        <TextInput
          value={recipient}
          onChangeText={setRecipient}
          placeholder="Paste or enter address"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={{
            marginTop: 8,
            fontFamily: theme.fonts.mono,
            fontSize: moderateScale(13),
            letterSpacing: -0.26,
            color: theme.colors.textPrimary,
          }}
        />
        {addressCheck && !addressCheck.success ? (
          <Text variant="small" color="error" style={{ marginTop: 6 }}>
            {addressCheck.reason === 'EMPTY_ADDRESS' ? 'Enter an address' : 'That doesn\u2019t look like a valid address'}
          </Text>
        ) : null}
      </Card>

      {/* Amount card */}
      <Card style={{ alignItems: 'center', padding: 16 }}>
        <Text variant="small" style={{ marginBottom: 4 }}>Amount</Text>
        <TextInput
          value={inputText}
          onChangeText={onChangeAmount}
          placeholder="0"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          style={{
            fontSize: moderateScale(40),
            fontWeight: '700',
            textAlign: 'center',
            width: '100%',
            paddingVertical: moderateScale(20),
            color: theme.colors.textPrimary,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="small">{mode === 'crypto' ? asset.getSymbol() : 'USD'}</Text>
          <Pressable onPress={toggleMode}>
            <ArrowUpDown size={moderateScale(14)} color={theme.colors.brand} />
          </Pressable>
          <Text variant="small">
            {mode === 'crypto'
              ? `\u2248 ${fiatAmount ? `$${fiatAmount.toFixed(2)}` : '\u2014'}`
              : `\u2248 ${cryptoAmount.toFixed(asset.getDecimals() > 6 ? 6 : asset.getDecimals())} ${asset.getSymbol()}`}
          </Text>
        </View>

        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="small">Available</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: moderateScale(13) }}>
              {availableCrypto.toFixed(asset.getDecimals() > 6 ? 6 : asset.getDecimals())} {asset.getSymbol()}
            </Text>
            <Pill label="Max" active onPress={onMax} />
          </View>
        </View>

        {!hasEnoughBalance && cryptoAmount.isGreaterThan(0) ? (
          <Text variant="small" color="error" style={{ marginTop: 8 }}>Insufficient balance</Text>
        ) : null}
      </Card>

      <View style={{ marginTop: 'auto' }}>
        <Button label="Review" onPress={onReview} disabled={!canReview} />
      </View>
    </Screen>
  );
}
