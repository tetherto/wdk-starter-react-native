import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ChevronRight } from 'lucide-react-native';
import { useModule } from '@tetherto/wdk-react-native-core';
import { Button, Card, Screen, ScreenHeader, Text, TextField } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useToast } from '@/state/toast';
import { useWalletConnect } from '@/state/walletConnect';
import { isWalletConnectConfigured, WALLETCONNECT_MODULE } from '@/wdk/walletconnect/moduleConfig';
import type { WalletConnectApi } from '@/wdk/walletconnect/types';

/**
 * WalletConnect home: pair with a dApp by pasting its `wc:` link, see what
 * is waiting on a decision, and manage connected dApps.
 */
export default function WalletConnect() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const showToast = useToast((s) => s.show);
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);

  const proposals = useWalletConnect((s) => s.proposals);
  const requests = useWalletConnect((s) => s.requests);
  const sessions = useWalletConnect((s) => s.sessions);

  const [uri, setUri] = useState('');
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // The list can change without an event reaching us (a session expiring
  // while the app was in the background), so re-read it whenever shown.
  useFocusEffect(
    useCallback(() => {
      if (!isWalletConnectConfigured) return;
      wc.getSessions()
        .then((list) => useWalletConnect.getState().setSessions(list ?? []))
        .catch(() => {});
    }, [wc]),
  );

  const onPaste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (text) {
      setUri(text);
      setError(null);
    }
  };

  const onConnect = async () => {
    const trimmed = uri.trim();
    if (!trimmed.startsWith('wc:')) {
      setError('That is not a WalletConnect link. It should start with "wc:".');
      return;
    }
    setPairing(true);
    setError(null);
    try {
      // Resolves once the pairing is set up; the dApp's connection request
      // then arrives as an event and opens its own screen.
      await wc.pair(trimmed);
      setUri('');
      showToast('Waiting for the app to send its connection request…');
    } catch (e: any) {
      setError(e?.message ?? 'Could not connect. The link may have expired.');
    } finally {
      setPairing(false);
    }
  };

  const onDisconnect = async (topic: string) => {
    setDisconnecting(topic);
    try {
      await wc.disconnect({ topic });
      useWalletConnect.getState().removeSession(topic);
    } catch (e: any) {
      showToast(e?.message ?? 'Could not disconnect.');
    } finally {
      setDisconnecting(null);
    }
  };

  if (!isWalletConnectConfigured) {
    return (
      <Screen>
        <ScreenHeader title="WalletConnect" onBack={() => router.back()} />
        <Card>
          <Text variant="tokenName">Not set up</Text>
          <Text variant="small" color="textSecondary" style={{ marginTop: 6 }}>
            Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID in .env and rebuild. A project ID is free at
            dashboard.walletconnect.com — see docs/WALLETCONNECT.md.
          </Text>
        </Card>
      </Screen>
    );
  }

  const pendingCount = proposals.length + requests.length;

  return (
    <Screen scroll>
      <ScreenHeader title="WalletConnect" onBack={() => router.back()} />

      <TextField
        label="Connection link"
        placeholder="wc:…"
        value={uri}
        onChangeText={(text) => {
          setUri(text);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        style={{ minHeight: moderateScale(72), textAlignVertical: 'top' }}
      />
      <Text variant="small" color={error ? 'error' : 'textSecondary'} style={{ marginTop: 6 }}>
        {error ?? 'In the app you want to connect, choose WalletConnect and copy the link.'}
      </Text>
      <Button label="Paste" variant="secondary" onPress={onPaste} />
      <Button label="Connect" onPress={onConnect} loading={pairing} disabled={uri.trim().length === 0} />

      {pendingCount > 0 && (
        <>
          <Text variant="label" style={{ marginTop: 22, marginBottom: 6, fontWeight: 'bold' }}>
            Waiting for you
          </Text>
          {proposals.map((p) => (
            <PendingRow
              key={`p${p.id}`}
              title={p.proposer?.name || 'Unknown app'}
              subtitle="Wants to connect"
              onPress={() => router.push('/walletconnect/proposal')}
            />
          ))}
          {requests.map((r) => (
            <PendingRow
              key={`r${r.id}`}
              title={r.peer?.name || 'Unknown app'}
              subtitle="Wants a signature"
              onPress={() => router.push('/walletconnect/request')}
            />
          ))}
        </>
      )}

      <Text variant="label" style={{ marginTop: 22, marginBottom: 6, fontWeight: 'bold' }}>
        Connected apps
      </Text>
      {sessions.length === 0 ? (
        <Text variant="small" color="textSecondary">No apps connected.</Text>
      ) : (
        sessions.map((session) => (
          <Card key={session.topic} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text variant="tokenName" numberOfLines={1}>{session.peer?.name || 'Unknown app'}</Text>
              <Text variant="small" color="textSecondary" numberOfLines={1}>{session.peer?.url || '—'}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={disconnecting === session.topic}
              onPress={() => onDisconnect(session.topic)}
              style={{
                paddingVertical: moderateScale(8),
                paddingHorizontal: moderateScale(12),
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.brandTint,
                opacity: disconnecting === session.topic ? 0.6 : 1,
              }}
            >
              <Text variant="small" color="brand">
                {disconnecting === session.topic ? 'Disconnecting…' : 'Disconnect'}
              </Text>
            </Pressable>
          </Card>
        ))
      )}
    </Screen>
  );
}

function PendingRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="tokenName" numberOfLines={1}>{title}</Text>
          <Text variant="small" color="textSecondary">{subtitle}</Text>
        </View>
        <ChevronRight size={moderateScale(18)} color={theme.colors.textSecondary} />
      </Card>
    </Pressable>
  );
}
