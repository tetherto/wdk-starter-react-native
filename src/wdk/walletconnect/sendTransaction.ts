import type { DappTransaction, TypedData } from './requests';

/**
 * The 7702 gasless account methods the generic `useAccount()` doesn't expose
 * directly, reached through its `extension()`.
 */
export interface Evm7702Extension {
  signTypedData(args: { domain: TypedData['domain']; types: TypedData['types']; message: TypedData['message'] }): Promise<string>;
  sendTransaction(tx: DappTransaction): Promise<{ hash: string }>;
  waitForTransaction(userOpHash: string): Promise<{
    finality: string;
    userOperationReceipt: { success: boolean; receipt: { transactionHash: string } } | null;
  }>;
}

/**
 * Sends a dApp transaction from the EIP-7702 delegated account and returns
 * the hash of the transaction that put it on chain.
 *
 * The account does not broadcast a transaction itself: it signs a user
 * operation (with the 7702 authorization on first use) and hands it to the
 * bundler, which returns a user operation hash. dApps expect a transaction
 * hash they can look up on chain, so this waits (up to the account's
 * 3-minute default) until the operation is in a block and returns the
 * bundling transaction's hash.
 *
 * That transaction is sent by the bundler to the EntryPoint, and it succeeds
 * even when the dApp's call inside it reverts. Success is therefore read from
 * the user operation's own receipt, and a revert is reported as an error.
 *
 * `onSubmitted` fires once the bundler has accepted the operation, so the
 * screen can stop offering Reject.
 */
export async function sendDappTransaction(
  account: Evm7702Extension,
  tx: DappTransaction,
  node: { rpcUrl: string | undefined; from: string },
  onSubmitted: () => void,
): Promise<string> {
  let userOpHash: string | undefined;
  try {
    userOpHash = (await account.sendTransaction(tx))?.hash;
  } catch (e: any) {
    // The bundler's gas estimate fails the same way whether the call reverts
    // or the bundler is unreachable, so ask the node which.
    if (/estimateUserOperationGas/.test(e?.message ?? '')) {
      const reason = await onChainFailure(node.rpcUrl, node.from, tx);
      throw new Error(
        reason
          ? `This transaction would fail on chain (${reason}), so it was not sent.`
          : 'The bundler did not accept this transaction, so it was not sent. Try again later.',
      );
    }
    throw e;
  }
  if (!userOpHash) throw new Error('The transaction could not be submitted.');
  onSubmitted();

  let result: Awaited<ReturnType<Evm7702Extension['waitForTransaction']>>;
  try {
    result = await account.waitForTransaction(userOpHash);
  } catch (e: any) {
    throw new Error(
      `The transaction was submitted (user operation ${userOpHash}) but is not on chain yet: ${e?.message ?? e}. It may still go through.`,
    );
  }
  if (result?.finality === 'dropped') {
    throw new Error(`The bundler dropped the transaction (user operation ${userOpHash}).`);
  }
  const op = result?.userOperationReceipt;
  if (!op?.receipt?.transactionHash) {
    throw new Error(`The transaction is on chain but its receipt is not available yet (user operation ${userOpHash}).`);
  }
  if (!op.success) throw new Error(`The transaction was included in ${op.receipt.transactionHash} but the call reverted.`);
  return op.receipt.transactionHash;
}

/**
 * Runs `tx` from `from` as an eth_call. Returns why it fails on chain, or
 * null if it succeeds or the node gives no answer.
 */
async function onChainFailure(rpcUrl: string | undefined, from: string, tx: DappTransaction): Promise<string | null> {
  if (!rpcUrl) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10_000);
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ from, to: tx.to, value: `0x${BigInt(tx.value).toString(16)}`, data: tx.data }, 'latest'],
      }),
      signal: abort.signal,
    });
    const { error } = await res.json();
    const message: string = error?.message ?? '';
    // Worded differently by geth ("insufficient funds") and reth ("OutOfFunds").
    if (/insufficient funds|out ?of ?funds/i.test(message)) return 'not enough funds for its value';
    if (error?.code === 3 || /revert/i.test(message)) return message || 'execution reverted';
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
