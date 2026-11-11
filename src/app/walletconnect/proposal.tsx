import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useModule } from '@tetherto/wdk-react-native-core';
import { Button, Card, Screen, ScreenHeader, Text } from '@/components';
import { useToast } from '@/state/toast';
import { useWalletConnect } from '@/state/walletConnect';
import { useWdkAccount, useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';
import { networkDisplayName } from '@/wdk/chains';
import { DappSummary } from '@/wdk/walletconnect/DappSummary';
import { EVM_CHAINS, FIRST_EVM_NETWORK, networkForChain, supportedNamespacesFor } from '@/wdk/walletconnect/chains';
import { WALLETCONNECT_MODULE } from '@/wdk/walletconnect/moduleConfig';
import type { WalletConnectApi } from '@/wdk/walletconnect/types';

export default function Proposal() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);

  // Pin to one proposal (the one tapped, else the first in line) so resolving
  // it doesn't swap another one in mid-transition.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [proposalId] = useState(() => (id ? Number(id) : useWalletConnect.getState().proposals[0]?.id));
  const proposal = useWalletConnect((s) => s.proposals.find((p) => p.id === proposalId));

  const account = useWdkAccount();
  const { address } = useWdkAddressForNetwork(FIRST_EVM_NETWORK ?? '');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!proposal) {
    return (
      <Screen>
        <ScreenHeader title="Connection request" onBack={() => router.back()} />
        <Text color="textSecondary">This connection request is no longer available. It may have expired.</Text>
      </Screen>
    );
  }

  const networks = EVM_CHAINS.map((chain) => networkDisplayName(networkForChain(chain) ?? chain)).join(', ');

  const finish = (message: string) => {
    useWalletConnect.getState().removeProposal(proposal.id);
    showToast(message);
    router.back();
  };

  const onApprove = async () => {
    setBusy('approve');
    setError(null);
    try {
      const session = await wc.approveSession({
        id: proposal.id,
        supportedNamespaces: supportedNamespacesFor(address),
      });
      useWalletConnect.setState((s) => ({ sessions: [...s.sessions.filter((x) => x.topic !== session.topic), session] }));
      finish(`Connected to ${proposal.proposer?.name || 'the app'}`);
    } catch (e: any) {
      setError(e?.message ?? 'Could not approve the connection.');
      setBusy(null);
    }
  };

  const onReject = async () => {
    setBusy('reject');
    try {
      await wc.rejectSession({ id: proposal.id });
    } catch {
      // Already expired or gone on the dApp's side — nothing left to reject.
    }
    finish('Connection rejected');
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Connection request" />

      <DappSummary peer={proposal.proposer} verify={proposal.verify} />

      <Text variant="label" style={{ marginTop: 18, marginBottom: 6 }}>It will be able to</Text>
      <Card>
        <Text variant="body">See your address and ask you to sign messages.</Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 6 }}>
          It cannot move funds or sign anything without your approval each time.
        </Text>
      </Card>

      <Text variant="label" style={{ marginTop: 18, marginBottom: 6 }}>Account</Text>
      <Card>
        <Text variant="tokenName">{account.data?.name ?? 'Account'}</Text>
        <Text variant="mono" mono numberOfLines={1} ellipsizeMode="middle" style={{ marginTop: 3 }}>
          {address || 'Loading…'}
        </Text>
        <Text variant="small" color="textSecondary" style={{ marginTop: 6 }}>On {networks}</Text>
      </Card>

      {error && (
        <Text variant="small" color="error" style={{ marginTop: 14 }}>{error}</Text>
      )}

      <View style={{ flex: 1 }} />
      <Button label="Connect" onPress={onApprove} loading={busy === 'approve'} disabled={!address || busy === 'reject'} />
      <Button label="Reject" variant="secondary" onPress={onReject} loading={busy === 'reject'} disabled={busy === 'approve'} />
    </Screen>
  );
}
