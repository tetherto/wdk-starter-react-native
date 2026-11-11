import React from 'react';
import { View } from 'react-native';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { Card, Text } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import type { PeerMetadata, VerifySummary } from './types';

/**
 * Who is asking: the dApp's self-reported name and URL, plus WalletConnect's
 * own domain check. The name and URL come from the dApp and can say
 * anything; the verify line is the only part it doesn't control.
 */
export function DappSummary({ peer, verify }: { peer: PeerMetadata | null; verify: VerifySummary | null }) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();

  const flagged = verify?.isScam || verify?.validation === 'INVALID';
  const verified = verify?.validation === 'VALID' && !verify.isScam;

  return (
    <Card>
      <Text variant="tokenName">{peer?.name || 'Unknown app'}</Text>
      <Text variant="small" color="textSecondary" style={{ marginTop: 2 }}>
        {peer?.url || 'No website given'}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        {flagged ? (
          <ShieldAlert size={moderateScale(16)} color={theme.colors.error} />
        ) : (
          <ShieldCheck size={moderateScale(16)} color={verified ? theme.colors.success : theme.colors.textSecondary} />
        )}
        <Text variant="small" color={flagged ? 'error' : 'textSecondary'} style={{ flex: 1 }}>
          {verify?.isScam
            ? 'WalletConnect has flagged this site as malicious.'
            : verify?.validation === 'INVALID'
              ? 'This request does not come from the site it claims to be.'
              : verified
                ? `Domain verified by WalletConnect: ${verify?.origin}`
                : 'WalletConnect could not verify this site. Only continue if you trust it.'}
        </Text>
      </View>
    </Card>
  );
}
