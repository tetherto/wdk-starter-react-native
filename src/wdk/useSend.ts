import BigNumber from 'bignumber.js';
import { ASSET_MAP } from './assets';

export interface SendParams {
  assetId: string;
  to: string;
  /** Human amount, e.g. "0.01". Converted to base units here. */
  amount: string;
}

export interface SendResult {
  hash: string | null;
  fee: string | null;
  error: string | null;
}

/**
 * Executes a real send. A plain async function, not a hook — see the
 * Review screen for why (it resolves the WDK account itself via a normal
 * useAccount() call, since which network to use depends on the asset,
 * which only the caller knows).
 *
 * REWRITTEN after a real runtime error: "account.transfer is not a
 * function". Verified the actual useAccount() hook's return shape directly
 * in @tetherto/wdk-react-native-core before fixing anything (not guessed):
 *
 *   { address, isLoading, error, account, getBalance, send, sign, verify,
 *     estimateFee, extension }
 *
 * `send` and `estimateFee` are GENERIC, cross-chain methods exposed
 * directly — they work for ANY native asset uniformly (Bitcoin, native
 * ETH, or any future native asset), taking the same
 * { to, asset, amount } shape. `.transfer()` and `.sendTransaction()` are
 * chain-specific and only exist on the object `.extension()` returns — this
 * is exactly what the ORIGINAL version of this file's own comment already
 * said ("token transfers use account.extension().transfer(...)") before an
 * earlier rewrite of mine mistakenly called .transfer()/.sendTransaction()
 * directly on the hook's return value, which doesn't have them.
 *
 * So the real logic is just two paths, not three:
 *   - Native (BTC or ETH): account.send({ to, asset, amount }) — generic.
 *   - Token (USDT/USDT0): account.extension().transfer({ token, recipient, amount }).
 */
export async function sendAsset(account: any, { assetId, to, amount }: SendParams): Promise<SendResult> {
  const asset = ASSET_MAP.get(assetId);
  if (!asset) return { hash: null, fee: null, error: 'Unknown asset' };

  let parsed: BigNumber;
  try {
    parsed = new BigNumber(amount);
  } catch {
    return { hash: null, fee: null, error: 'Enter a valid positive amount' };
  }
  if (!parsed.isFinite() || parsed.isNaN() || parsed.isNegative() || parsed.isZero()) {
    return { hash: null, fee: null, error: 'Enter a valid positive amount' };
  }
  const amountInBaseUnit = parsed.shiftedBy(asset.getDecimals()).toFixed(0);

  try {
    if (asset.isNative()) {
      const result = await account.send({ to, asset, amount: amountInBaseUnit });
      if (result && result.success === false) {
        return { hash: null, fee: null, error: result.error ?? 'Transfer failed' };
      }
      return {
        hash: result?.hash ?? null,
        fee: result?.fee != null ? String(result.fee) : null,
        error: null,
      };
    }

    // Token transfer (USDT/USDT0) — chain-specific, only reachable via
    // .extension(), not directly on the hook's return value.
    const tokenAddress = asset.getContractAddress();
    const result = await account.extension().transfer({
      token: tokenAddress,
      recipient: to,
      amount: BigInt(amountInBaseUnit),
    });
    return { hash: result?.hash ?? null, fee: result?.fee != null ? String(result.fee) : '0', error: null };
  } catch (e: any) {
    return { hash: null, fee: null, error: e?.message ?? 'Transfer failed' };
  }
}

/**
 * Estimates the fee for a send BEFORE the person confirms. For our EVM
 * config (isSponsored: true), fee is genuinely always 0 — verified
 * directly in the SDK's own fee-calculation source (defaults to a literal
 * 0n, only recalculated `if (!isSponsored)`), for BOTH native sends and
 * token transfers alike, since isSponsored is a wallet-level config, not
 * specific to one or the other. So there's nothing to call for those —
 * returned immediately. Bitcoin uses the same generic estimateFee() method
 * `send` itself uses, not a chain-specific quote call.
 */
export async function quoteSendFee(
  account: any,
  assetId: string,
  to: string,
  amount: string,
): Promise<{ fee: string; isSponsored: boolean } | { fee: null; isSponsored: boolean }> {
  const asset = ASSET_MAP.get(assetId);
  if (!asset) return { fee: null, isSponsored: false };

  if (asset.getNetwork() !== 'bitcoin') {
    return { fee: '0', isSponsored: true };
  }

  try {
    let parsed: BigNumber;
    try {
      parsed = new BigNumber(amount);
    } catch {
      return { fee: null, isSponsored: false };
    }
    if (!parsed.isFinite() || parsed.isNaN() || parsed.isNegative() || parsed.isZero()) {
      return { fee: null, isSponsored: false };
    }
    const amountInBaseUnit = parsed.shiftedBy(asset.getDecimals()).toFixed(0);
    const result = await account.estimateFee({ to, asset, amount: amountInBaseUnit });
    if (result && result.success === false) return { fee: null, isSponsored: false };
    return { fee: String(result.fee), isSponsored: false };
  } catch {
    return { fee: null, isSponsored: false };
  }
}