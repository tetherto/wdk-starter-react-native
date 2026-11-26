import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAccount, useAddresses, useModule } from '@tetherto/wdk-react-native-core';
import { Button, Card, Screen, ScreenHeader, Text } from '@/components';
import { useAccounts } from '@/state/accounts';
import { useToast } from '@/state/toast';
import { useWalletConnect } from '@/state/walletConnect';
import { CHAINS, networkDisplayName, type NetworkId } from '@/wdk/networks';
import { DappSummary } from '@/wdk/walletconnect/DappSummary';
import { networkForChain, sessionAllows } from '@/wdk/walletconnect/chains';
import { sendDappTransaction, type Evm7702Extension } from '@/wdk/walletconnect/sendTransaction';
import { TransactionSummary } from '@/wdk/walletconnect/TransactionSummary';
import { WALLETCONNECT_MODULE } from '@/wdk/walletconnect/moduleConfig';
import { parseRequest, signableTypes, type ParsedRequest } from '@/wdk/walletconnect/requests';
import type { SessionRequest, WalletConnectApi } from '@/wdk/walletconnect/types';

export default function Request() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);
  const { getAccountInfoFromAddress, loadAddresses } = useAddresses();

  // Pinned for the same reason as on the proposal screen.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [requestId] = useState(() => (id ? Number(id) : useWalletConnect.getState().requests[0]?.id));
  const request = useWalletConnect((s) => s.requests.find((r) => r.id === requestId));
  const [rejecting, setRejecting] = useState(false);

  // The request may name an account whose address hasn't been loaded in this
  // session yet (only the active account's is loaded eagerly). Load them all
  // so the lookup below can match it.
  const network = request ? networkForChain(request.chainId) : undefined;
  useEffect(() => {
    if (!network) return;
    loadAddresses(useAccounts.getState().indices, [network]).catch(() => {});
  }, [network, loadAddresses]);

  if (!request) {
    return (
      <Screen>
        <ScreenHeader title="Request" onBack={() => router.back()} />
        <Text color="textSecondary">This request is no longer available. It may have expired.</Text>
      </Screen>
    );
  }

  const finish = (message: string) => {
    useWalletConnect.getState().removeRequest(request.id);
    showToast(message);
    router.back();
  };

  const onReject = async (reason?: string) => {
    setRejecting(true);
    try {
      await wc.rejectRequest({ topic: request.topic, id: request.id, message: reason });
    } catch {
      // The session or request is already gone — nothing left to answer.
    }
    finish('Request rejected');
  };

  const parsed = parseRequest(request);
  // Which of this wallet's accounts the dApp is asking to sign with. An EVM
  // address is the same on every EVM network, so only the index matters.
  const owner = parsed.kind === 'unsupported' ? undefined : getAccountInfoFromAddress(parsed.address);
  const allowed = parsed.kind !== 'unsupported' && sessionAllows(request.accounts, request.chainId, parsed.address);

  const problem =
    parsed.kind === 'unsupported'
      ? parsed.reason
      : !network
        ? `This wallet has no network for ${request.chainId}.`
        : !allowed
          ? 'This app was not given access to the requested account.'
          : !owner
            ? 'The requested account is not one of this wallet’s loaded accounts.'
            : undefined;

  return (
    // The buttons sit outside the scroll area so a long request can never
    // push Reject off screen.
    <Screen>
      <ScreenHeader title={request.method === 'eth_sendTransaction' ? 'Transaction request' : 'Signature request'} />

      {parsed.kind === 'unsupported' || !network || !allowed || !owner ? (
        <>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <DappSummary peer={request.peer} verify={request.verify} />
            <Text variant="small" color="error" style={{ marginTop: 16 }}>{problem}</Text>
          </ScrollView>
          <Button label="Reject" onPress={() => onReject(problem)} loading={rejecting} />
        </>
      ) : (
        <Signer
          request={request}
          parsed={parsed}
          network={network}
          accountIndex={owner.accountIndex}
          rejecting={rejecting}
          onReject={onReject}
          onDone={finish}
        />
      )}
    </Screen>
  );
}

/**
 * Split out so `useAccount` is only ever mounted with a resolved network and
 * account index.
 */
function Signer({
  request,
  parsed,
  network,
  accountIndex,
  rejecting,
  onReject,
  onDone,
}: {
  request: SessionRequest;
  parsed: Exclude<ParsedRequest, { kind: 'unsupported' }>;
  network: NetworkId;
  accountIndex: number;
  rejecting: boolean;
  /** `reason` is passed on to the dApp. */
  onReject: (reason?: string) => void;
  onDone: (toast: string) => void;
}) {
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);
  const account = useAccount<Evm7702Extension>({ network, accountIndex });
  const accountName = useAccounts((s) => s.names[accountIndex]) ?? `Account ${accountIndex + 1}`;
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the bundler has accepted a transaction: from then on it cannot
  // be called back, so Reject goes away.
  const [submitted, setSubmitted] = useState(false);
  // Set when a submitted transaction failed or timed out and the dApp has
  // been told. Only Done is left.
  const [failed, setFailed] = useState(false);

  const isTransaction = parsed.kind === 'transaction';

  // What the dApp gets back: a signature, or the hash of the transaction.
  const approve = async (onSubmitted: () => void): Promise<string> => {
    if (parsed.kind === 'transaction') {
      const node = { rpcUrl: CHAINS[network].evm?.provider, from: parsed.address };
      return sendDappTransaction(account.extension(), parsed.tx, node, onSubmitted);
    }
    if (parsed.kind === 'message') {
      const result = await account.sign(parsed.message);
      if (!result.success || !result.signature) throw new Error(result.error ?? 'Signing failed.');
      return result.signature;
    }
    const signature = await account.extension().signTypedData({
      domain: parsed.typedData.domain,
      types: signableTypes(parsed.typedData),
      message: parsed.typedData.message,
    });
    if (!signature) throw new Error('Signing failed.');
    return signature;
  };

  const onApprove = async () => {
    setSigning(true);
    setError(null);
    let sent = false;
    let result: string;
    try {
      result = await approve(() => {
        sent = true;
        setSubmitted(true);
      });
    } catch (e: any) {
      const message = e?.message ?? (isTransaction ? 'The transaction failed.' : 'Signing failed.');
      setError(message);
      if (!sent) {
        // Nothing left the device: the user can try again or reject.
        setSigning(false);
        return;
      }
      // The operation is with the bundler, so a retry could send it twice.
      // Tell the dApp what happened and stop here.
      try {
        await wc.failTransaction({ topic: request.topic, id: request.id, message });
      } catch {
        // The request already expired on the dApp's side.
      }
      setFailed(true);
      return;
    }
    const done = isTransaction ? 'Transaction sent' : 'Signed';
    try {
      await wc.respondRequest({ topic: request.topic, id: request.id, result });
      onDone(done);
    } catch {
      // Typically the request expired while the transaction was being
      // included. What was signed or sent still stands.
      onDone(`${done}, but the app could not be told`);
    }
  };

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <DappSummary peer={request.peer} verify={request.verify} />
        {isTransaction ? (
          <TransactionSummary tx={parsed.tx} network={network} />
        ) : (
          <>
            <Text variant="label" style={{ marginTop: 18, marginBottom: 6 }}>
              {parsed.kind === 'message' ? 'Message' : 'Typed data'}
            </Text>
            <Card>
              {parsed.kind === 'message' ? (
                <Text variant="body">{parsed.message}</Text>
              ) : (
                <Text variant="mono" mono>
                  {JSON.stringify(
                    { domain: parsed.typedData.domain, primaryType: parsed.typedData.primaryType, message: parsed.typedData.message },
                    null,
                    2,
                  )}
                </Text>
              )}
            </Card>
          </>
        )}

        <Text variant="label" style={{ marginTop: 18, marginBottom: 6 }}>{isTransaction ? 'Sending from' : 'Signing with'}</Text>
        <Card>
          <Text variant="tokenName">{accountName}</Text>
          <Text variant="mono" mono numberOfLines={1} ellipsizeMode="middle" style={{ marginTop: 3 }}>
            {parsed.address}
          </Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 6 }}>On {networkDisplayName(network)}</Text>
        </Card>

        <Text variant="small" color="textSecondary" style={{ marginTop: 14 }}>
          {isTransaction
            ? 'Sending runs this transaction on chain from your account. It cannot be undone. Only send what you understand.'
            : 'Signing does not send a transaction or cost anything, but a signature can authorize actions on the app that asked for it. Only sign what you understand.'}
        </Text>
        {submitted && !failed && (
          <Text variant="small" color="textSecondary" style={{ marginTop: 10 }}>
            Sent. Waiting for it to be included on chain…
          </Text>
        )}
        {(error || account.error) && (
          <Text variant="small" color="error" style={{ marginTop: 10 }}>
            {error ?? `This account could not be loaded on ${networkDisplayName(network)}, so it cannot ${isTransaction ? 'send' : 'sign'} there.`}
          </Text>
        )}
      </ScrollView>

      {failed ? (
        <Button label="Done" onPress={() => onDone('Transaction failed')} />
      ) : (
        <>
          <Button
            label={isTransaction ? 'Send' : 'Sign'}
            onPress={onApprove}
            loading={signing || account.isLoading}
            disabled={!account.address || rejecting}
          />
          {!submitted && (
            // A shown error (e.g. the call would revert) tells the dApp why.
            <Button label="Reject" variant="secondary" onPress={() => onReject(error ?? undefined)} loading={rejecting} disabled={signing} />
          )}
        </>
      )}
    </>
  );
}
