import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BigNumber from 'bignumber.js';
import { useAccount } from '@tetherto/wdk-react-native-core';
import { Screen, ScreenHeader, Text, Card, Button, AssetIcon, LoadingState } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useAccounts } from '@/state/accounts';
import { usePrices } from '@/wdk/pricing';
import { ASSETS } from '@/wdk/assets';
import { sendAsset, quoteSendFee } from '@/wdk/useSend';
import { useWdkBalances } from '@/wdk/hooks/useWalletData';
import { usePendingRefresh } from '@/state/pendingRefresh';
import { networkDisplayName } from '@/wdk/chains';

/**
 * Formats a crypto amount WITHOUT unnecessary trailing zeros — "1.000000"
 * displays as "1", "1.500000" as "1.5". The route param arrives already
 * fixed to the asset's full decimal precision (from send/amount.tsx), which
 * is correct for internal math, but not what should be SHOWN — the
 * prototype doesn't pad whole numbers out to 6 decimal places either.
 */
function formatCryptoAmount(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Send — review/confirm. Matches the prototype's `send-review` screen: hero
 * (icon + amount + fiat-on-network), a details card (From/To/Network/Fee),
 * Total, and a Confirm button that executes a REAL send.
 *
 * Fee copy deliberately does NOT copy the prototype's "gasless · paid in
 * USDT" wording verbatim — that models Tron GasFree's specific mechanism
 * (a relay that charges a fee in the token itself). This app's EVM sends use
 * EIP-7702 sponsorship (isSponsored: true), which is genuinely different:
 * verified directly against the SDK's own fee-calculation source that the
 * fee defaults to a literal 0 and is only ever recalculated when NOT
 * sponsored. So Ethereum/Arbitrum/Polygon sends here are truly free, shown
 * as "Free · sponsored" — Bitcoin shows its real, quoted network fee, since
 * Bitcoin has no sponsorship at all.
 *
 * Account resolution: uses the person's REAL active account
 * (useAccounts().activeIndex) and the asset's real network — this directly
 * fixes a bug found while building this screen: useSend.ts previously
 * hardcoded account index 0, which would have silently sent from the wrong
 * account after switching accounts.
 */
export default function SendReview() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { tokenId, recipient, amount } = useLocalSearchParams<{
    tokenId: string;
    recipient: string;
    amount: string;
  }>();

  const asset = ASSETS.find((a) => a.getId() === tokenId);
  const activeIndex = useAccounts((s) => s.activeIndex);
  const accountName = useAccounts((s) => s.names[activeIndex] ?? `Account ${activeIndex + 1}`);
  const account = useAccount({ network: asset?.getNetwork() ?? 'bitcoin', accountIndex: activeIndex });
  const { prices } = usePrices(asset ? [asset.getSymbol()] : []);
  const price = asset ? prices[asset.getSymbol()] : null;

  // Only used here to force a fresh balance fetch right after a successful
  // send — belt-and-suspenders alongside the useFocusEffect fixes on
  // Home/Accounts, ensuring the SENDER's own balance is guaranteed fresh
  // the moment we navigate away, not dependent on a refetch happening to
  // trigger correctly on the next screen.
  const activeBalances = useWdkBalances();

  const [fee, setFee] = useState<{ fee: string; isSponsored: boolean } | null>(null);
  const [isQuoting, setIsQuoting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!asset || !recipient || !amount) return;
    let cancelled = false;
    setIsQuoting(true);
    quoteSendFee(account, asset.getId(), recipient, amount).then((result) => {
      if (!cancelled) {
        setFee(result.fee != null ? { fee: result.fee, isSponsored: result.isSponsored } : null);
        setIsQuoting(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.getId(), recipient, amount]);

  if (!asset || !recipient || !amount) {
    return (
      <Screen>
        <ScreenHeader title="Review" onBack={() => router.back()} />
        <Text variant="body" color="error">Missing send details.</Text>
      </Screen>
    );
  }

  const networkName = networkDisplayName(asset.getNetwork());
  const shortRecipient = `${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
  const fiatValue = price ? new BigNumber(amount).multipliedBy(price).toFixed(2) : null;

  const feeDisplay = !fee
    ? '—'
    : fee.isSponsored
      ? 'Free'
      : `${formatCryptoAmount(new BigNumber(fee.fee).shiftedBy(-asset.getDecimals()).toFixed(asset.getDecimals()))} ${asset.getSymbol()}`;

  const total = fee && !fee.isSponsored
    ? new BigNumber(amount).plus(new BigNumber(fee.fee).shiftedBy(-asset.getDecimals())).toFixed(asset.getDecimals())
    : amount;

  const onConfirm = async () => {
    setSendError(null);
    setIsSending(true);
    const result = await sendAsset(account, { assetId: asset.getId(), to: recipient, amount });
    setIsSending(false);
    if (result.error || !result.hash) {
      setSendError(result.error ?? 'Send failed. Please try again.');
      return;
    }
    activeBalances.refetch();
    usePendingRefresh.getState().markPending();
    router.replace(`/send/success?txHash=${result.hash}&tokenId=${asset.getId()}&amount=${amount}`);
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Review" onBack={() => router.back()} />

      <View style={{ alignItems: 'center', paddingVertical: moderateScale(18) }}>
        <AssetIcon
          symbol={asset.getSymbol()}
          network={asset.getNetwork()}
          size={moderateScale(56)}
          showChainBadge={asset.getSymbol().startsWith('USDT')}
        />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontSize: moderateScale(34),
            // Explicit, generous lineHeight — the real fix for vertical
            // clipping (top/bottom cut off even on short values like
            // "10.01 USDT" that don't need width-shrinking at all). Bold,
            // large text on Android in particular can clip its own
            // ascenders/descenders without enough line-height room; the
            // earlier numberOfLines/adjustsFontSizeToFit fix only addressed
            // WIDTH overflow, a separate concern from this.
            lineHeight: moderateScale(34) * 1.3,
            fontWeight: '700',
            letterSpacing: -0.68,
            marginTop: 12,
            maxWidth: '100%',
          }}
        >
          {formatCryptoAmount(amount)} {asset.getSymbol()}
        </Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 4 }}>
          {fiatValue ? `≈ $${fiatValue}` : ''} on {networkName}
        </Text>
      </View>

      <Card style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        <Row label="From" value={accountName} />
        <Row label="To" value={shortRecipient} mono divider />
        <Row label="Network" value={networkName} divider />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingVertical: moderateScale(10),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text variant="small">Network fee</Text>
          <View style={{ alignItems: 'flex-end' }}>
            {isQuoting ? (
              <Text style={{ fontSize: moderateScale(14) }}>…</Text>
            ) : (
              <>
                <Text style={{ fontSize: moderateScale(14) }}>{feeDisplay}</Text>
                {fee?.isSponsored ? (
                  <Text variant="small" color="success" style={{ marginTop: 1 }}>gasless · sponsored</Text>
                ) : null}
              </>
            )}
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: moderateScale(12),
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text style={{ fontSize: moderateScale(14), fontWeight: '500' }}>Total</Text>
          <Text style={{ fontSize: moderateScale(14), fontWeight: '500' }}>{formatCryptoAmount(total)} {asset.getSymbol()}</Text>
        </View>
      </Card>

      {sendError ? (
        <Text variant="small" color="error" style={{ marginTop: 8 }}>{sendError}</Text>
      ) : null}

      <View style={{ marginTop: 'auto' }}>
        <Button label="Confirm" onPress={onConfirm} loading={isSending} disabled={isQuoting || isSending} />
      </View>
    </Screen>
  );
}

function Row({ label, value, mono, divider }: { label: string; value: string; mono?: boolean; divider?: boolean }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: moderateScale(10),
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: theme.colors.border,
      }}
    >
      <Text variant="small">{label}</Text>
      {mono ? (
        <Text variant="mono" mono>{value}</Text>
      ) : (
        <Text style={{ fontSize: moderateScale(14) }}>{value}</Text>
      )}
    </View>
  );
}
