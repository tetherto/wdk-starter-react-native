import { useCallback, useState } from 'react';
import BigNumber from 'bignumber.js';
import { useAccount } from '@tetherto/wdk-react-native-core';
import { ASSET_MAP, ASSETS } from './assets';

const ACCOUNT_INDEX = 0;

export interface SendParams {
  assetId: string;
  to: string;
  /** Human amount, e.g. "0.01". Converted to base units here. */
  amount: string;
}

/**
 * Send hook (Step 4).
 *
 * Wraps WDK's account.send for native-asset transfers. Amounts are entered by
 * humans (e.g. "0.01 BTC") and converted to base units (satoshis) with
 * BigNumber before handing to WDK — mirroring the showcase's transfer logic.
 *
 * Note: token (non-native) transfers use account.extension().transfer(...),
 * which is chain-specific (EVM/Tron). The starter ships Bitcoin (native) only,
 * so we implement the native path; the token path is documented for when more
 * chains are added.
 */
export function useSend() {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Account is created for the asset's network at call time via the hook below.
  const primary = ASSETS[0];
  const account = useAccount({ network: primary.getNetwork(), accountIndex: ACCOUNT_INDEX });

  const send = useCallback(
    async ({ assetId, to, amount }: SendParams): Promise<string | null> => {
      setError(null);
      setTxHash(null);

      const asset = ASSET_MAP.get(assetId);
      if (!asset) {
        setError('Unknown asset');
        return null;
      }
      // Validate amount (BigNumber can NaN on locale input like "1,5").
      let parsed: BigNumber;
      try {
        parsed = new BigNumber(amount);
      } catch {
        setError('Enter a valid positive amount');
        return null;
      }
      if (!parsed.isFinite() || parsed.isNaN() || parsed.isNegative() || parsed.isZero()) {
        setError('Enter a valid positive amount');
        return null;
      }
      const amountInBaseUnit = parsed.shiftedBy(asset.getDecimals()).toFixed(0);

      setIsSending(true);
      try {
        if (!asset.isNative()) {
          // Token transfers are chain-specific (account.extension().transfer).
          // Not needed for Bitcoin-only starter; add when EVM/Tron are enabled.
          setError('Token transfers not supported yet');
          return null;
        }
        const result = await account.send({ to, amount: amountInBaseUnit, asset });
        // Native send returns TransactionResult { success, error, hash, fee }
        // and resolves (does not throw) on failure.
        if (result && 'success' in result && result.success === false) {
          setError((result as { error?: string }).error ?? 'Transfer failed');
          return null;
        }
        const hash = result?.hash ?? '';
        setTxHash(hash);
        return hash;
      } catch (e: any) {
        setError(e?.message ?? 'Transfer failed');
        return null;
      } finally {
        setIsSending(false);
      }
    },
    [account],
  );

  return { send, isSending, error, txHash };
}
