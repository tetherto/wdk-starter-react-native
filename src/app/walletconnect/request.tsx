import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAccount, useAddresses, useModule } from '@tetherto/wdk-react-native-core';
import { Button, Card, Screen, ScreenHeader, Text } from '@/components';
import { useAccounts } from '@/state/accounts';
import { useToast } from '@/state/toast';
import { useWalletConnect } from '@/state/walletConnect';
import { networkDisplayName } from '@/wdk/chains';
import { DappSummary } from '@/wdk/walletconnect/DappSummary';
import { networkForChain } from '@/wdk/walletconnect/chains';
import { WALLETCONNECT_MODULE } from '@/wdk/walletconnect/moduleConfig';
import { parseRequest, signableTypes, type ParsedRequest, type TypedData } from '@/wdk/walletconnect/requests';
import type { SessionRequest, WalletConnectApi } from '@/wdk/walletconnect/types';

/** The chain-specific account method the generic hook doesn't expose directly. */
interface EvmSigningExtension {
  signTypedData(args: { domain: TypedData['domain']; types: TypedData['types']; message: TypedData['message'] }): Promise<string>;
}

type Signable = Exclude<ParsedRequest, { kind: 'unsupported' }>;

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
        <ScreenHeader title="Signature request" onBack={() => router.back()} />
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

  const problem =
    parsed.kind === 'unsupported'
      ? parsed.reason
      : !network
        ? `This wallet has no network for ${request.chainId}.`
        : !owner
          ? 'The requested account is not one of this wallet’s loaded accounts.'
          : undefined;

  return (
    // The buttons sit outside the scroll area so a long request can never
    // push Reject off screen.
    <Screen>
      <ScreenHeader title="Signature request" />

      {parsed.kind === 'unsupported' || !network || !owner ? (
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
          onReject={() => onReject()}
          onSigned={() => finish('Signed')}
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
  onSigned,
}: {
  request: SessionRequest;
  parsed: Signable;
  network: string;
  accountIndex: number;
  rejecting: boolean;
  onReject: () => void;
  onSigned: () => void;
}) {
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);
  const account = useAccount<EvmSigningExtension>({ network, accountIndex });
  const accountName = useAccounts((s) => s.names[accountIndex]) ?? `Account ${accountIndex + 1}`;
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onApprove = async () => {
    setSigning(true);
    setError(null);
    try {
      let signature: string | undefined;
      if (parsed.kind === 'message') {
        const result = await account.sign(parsed.message);
        if (!result.success) throw new Error(result.error ?? 'Signing failed.');
        signature = result.signature;
      } else {
        signature = await account.extension().signTypedData({
          domain: parsed.typedData.domain,
          types: signableTypes(parsed.typedData),
          message: parsed.typedData.message,
        });
      }
      if (!signature) throw new Error('Signing failed.');
      await wc.respondRequest({ topic: request.topic, id: request.id, result: signature });
      onSigned();
    } catch (e: any) {
      setError(e?.message ?? 'Signing failed.');
      setSigning(false);
    }
  };

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <DappSummary peer={request.peer} verify={request.verify} />
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

        <Text variant="label" style={{ marginTop: 18, marginBottom: 6 }}>Signing with</Text>
        <Card>
          <Text variant="tokenName">{accountName}</Text>
          <Text variant="mono" mono numberOfLines={1} ellipsizeMode="middle" style={{ marginTop: 3 }}>
            {parsed.address}
          </Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 6 }}>On {networkDisplayName(network)}</Text>
        </Card>

        <Text variant="small" color="textSecondary" style={{ marginTop: 14 }}>
          Signing does not send a transaction or cost anything, but a signature can authorize actions on the app that asked
          for it. Only sign what you understand.
        </Text>
        {(error || account.error) && (
          <Text variant="small" color="error" style={{ marginTop: 10 }}>
            {error ?? `This account could not be loaded on ${networkDisplayName(network)}, so it cannot sign there.`}
          </Text>
        )}
      </ScrollView>

      <Button label="Sign" onPress={onApprove} loading={signing} disabled={!account.address || rejecting} />
      <Button label="Reject" variant="secondary" onPress={onReject} loading={rejecting} disabled={signing} />
    </>
  );
}
