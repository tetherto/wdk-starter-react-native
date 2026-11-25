import type { DappTransaction } from './requests';

/**
 * The 7702 gasless account methods used to answer `eth_sendTransaction`,
 * reached through `useAccount().extension()`. Bigints come back as strings
 * after crossing the worklet boundary.
 */
export interface Evm7702SendExtension {
  sendTransaction(tx: DappTransaction): Promise<{ hash: string }>;
  getUserOperationReceipt(hash: string): Promise<{
    success: boolean;
    receipt: { transactionHash: string } | null;
  } | null>;
}

const POLL_INTERVAL_MS = 2_000;
// Matches the 7702 account's own default wait for bundler inclusion.
const INCLUSION_TIMEOUT_MS = 180_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a dApp transaction from the EIP-7702 delegated account and returns
 * the hash of the transaction that put it on chain.
 *
 * The account does not broadcast a transaction itself: it signs a user
 * operation (with the 7702 authorization on first use) and hands it to the
 * bundler, which returns a user operation hash. dApps expect a transaction
 * hash they can look up on chain, so this waits until the bundler has
 * included the operation and returns the bundling transaction's hash.
 *
 * That transaction is sent by the bundler to the EntryPoint, and it succeeds
 * even when the dApp's call inside it reverts. A revert is therefore
 * reported as an error here, since the dApp could not tell from the
 * transaction's own receipt.
 *
 * `onSubmitted` fires once the bundler has accepted the operation, so the
 * screen can stop offering Reject.
 */
export async function sendDappTransaction(
  account: Evm7702SendExtension,
  tx: DappTransaction,
  onSubmitted: () => void,
): Promise<string> {
  const submitted = await account.sendTransaction(tx);
  const userOpHash = submitted?.hash;
  if (!userOpHash) throw new Error('The transaction could not be submitted.');
  onSubmitted();

  const deadline = Date.now() + INCLUSION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    let result: Awaited<ReturnType<Evm7702SendExtension['getUserOperationReceipt']>>;
    try {
      result = await account.getUserOperationReceipt(userOpHash);
    } catch {
      continue; // a flaky bundler response; try again until the deadline
    }
    const txHash = result?.receipt?.transactionHash;
    if (!result || !txHash) continue;
    if (!result.success) throw new Error(`The transaction was included in ${txHash} but the call reverted.`);
    return txHash;
  }
  throw new Error(
    `The transaction was submitted (user operation ${userOpHash}) but was not on chain after 3 minutes. It may still go through.`,
  );
}
