import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useModule } from '@tetherto/wdk-react-native-core';
import { Button, Card, Screen, ScreenHeader, Text } from '@/components';
import { useToast } from '@/state/toast';
import { useWalletConnect } from '@/state/walletConnect';
import { useWdkAccount, useWdkAddressForNetwork } from '@/wdk/hooks/useWalletData';
import { networkDisplayName } from '@/wdk/chains';
import { DappSummary } from '@/wdk/walletconnect/DappSummary';
import {
  EVM_CHAINS,
  EVM_METHODS,
  FIRST_EVM_NETWORK,
  networkForChain,
  supportedNamespacesFor,
} from '@/wdk/walletconnect/chains';
import { WALLETCONNECT_MODULE } from '@/wdk/walletconnect/moduleConfig';
import type { SessionProposal, WalletConnectApi } from '@/wdk/walletconnect/types';

/**
 * What the dApp insists on that this wallet can't give. Anything listed
 * under `requiredNamespaces` is all-or-nothing in WalletConnect, so one
 * unsupported chain or method means the session can't be approved at all.
 */
function unsupportedRequirements(proposal: SessionProposal): string[] {
  const problems: string[] = [];
  for (const [key, namespace] of Object.entries(proposal.requiredNamespaces)) {
    // A namespace key is either a family ("eip155") or a single chain ("eip155:1").
    const chains = namespace.chains ?? (key.includes(':') ? [key] : []);
    if (!key.startsWith('eip155')) {
      problems.push(`${key} networks`);
      continue;
    }
    for (const chain of chains) if (!EVM_CHAINS.includes(chain)) problems.push(`network ${chain}`);
    for (const method of namespace.methods) if (!EVM_METHODS.includes(method)) problems.push(method);
  }
  return Array.from(new Set(problems));
}

export default function Proposal() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);

  // Pin to the proposal that was first in line when the screen opened, so
  // resolving it doesn't swap another one in mid-transition.
  const [proposalId] = useState(() => useWalletConnect.getState().proposals[0]?.id);
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

  const blockers = unsupportedRequirements(proposal);
  const networks = EVM_CHAINS.map((chain) => networkDisplayName(networkForChain(chain) ?? chain)).join(', ');

  const finish = (message: string) => {
    useWalletConnect.getState().removeProposal(proposal.id);
    showToast(message);
    router.back();
  };

  const onApprove = async () => {
    if (!address) return;
    setBusy('approve');
    setError(null);
    try {
      const session = await wc.approveSession({
        id: proposal.id,
        supportedNamespaces: supportedNamespacesFor(address),
      });
      const store = useWalletConnect.getState();
      store.setSessions([...store.sessions.filter((s) => s.topic !== session.topic), session]);
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

      {blockers.length > 0 && (
        <Text variant="small" color="error" style={{ marginTop: 14 }}>
          This app requires things this wallet does not support: {blockers.join(', ')}.
        </Text>
      )}
      {error && (
        <Text variant="small" color="error" style={{ marginTop: 14 }}>{error}</Text>
      )}

      <View style={{ flex: 1 }} />
      <Button
        label="Connect"
        onPress={onApprove}
        loading={busy === 'approve'}
        disabled={!address || blockers.length > 0 || busy === 'reject'}
      />
      <Button label="Reject" variant="secondary" onPress={onReject} loading={busy === 'reject'} disabled={busy === 'approve'} />
    </Screen>
  );
}
