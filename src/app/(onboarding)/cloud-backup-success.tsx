import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Screen, Text, Button } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import type { CloudProvider } from '@/wdk/cloud-backup/CloudBackupContext';

const PROVIDER_LABEL: Record<CloudProvider, string> = {
  icloud: 'iCloud',
  gdrive: 'Google Drive',
};

/**
 * Cloud backup — success. Matches the prototype's `cloud-backup-success`
 * screen: a success-tinted circle with a checkmark, title, body, and a
 * "backup is located at" detail row — all bottom-pinned by a Continue button.
 *
 * The prototype's body/location text is static placeholder copy ("iCloud",
 * "My iCloud > MyWalletBackup"). Here both are driven by the real `provider`
 * and `account` params passed from cloud-provider.tsx after a real upload
 * completes — so this reads correctly whichever provider was actually used,
 * not just the prototype's iCloud example.
 *
 * Note on `account` for iCloud specifically: Apple's CloudKit JS never
 * exposes a real email address (a documented privacy guarantee, not a gap in
 * our implementation — see CloudKitAuthWebView.tsx). If no discoverable
 * identity was available, `account` will be empty and this falls back to a
 * generic "Wallet Backup" label, matching the prototype's own placeholder
 * style rather than showing nothing.
 */
export default function CloudBackupSuccess() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { provider, account } = useLocalSearchParams<{ provider?: CloudProvider; account?: string }>();

  const providerLabel = provider ? PROVIDER_LABEL[provider] : 'the cloud';
  const locationLabel = `${providerLabel} › ${account || 'Wallet Backup'}`;

  return (
    <Screen scroll>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: moderateScale(56),
          paddingBottom: moderateScale(24),
        }}
      >
        <View
          style={{
            width: moderateScale(88),
            height: moderateScale(88),
            borderRadius: moderateScale(44),
            backgroundColor: theme.colors.successTint,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
            marginBottom: 20,
          }}
        >
          <Check size={moderateScale(44)} color={theme.colors.success} />
        </View>

        <Text variant="h1" center>Your wallet is backed up</Text>
        <Text variant="body" color="textSecondary" center style={{ marginTop: 8 }}>
          If you lose this device, you can recover your encrypted wallet backup from {providerLabel}.
        </Text>

        <View style={{ marginTop: 28, alignItems: 'center' }}>
          <Text variant="small" color="textSecondary" style={{ marginBottom: 6 }}>
            Your backup is located at:
          </Text>
          <Text variant="tokenName">{locationLabel}</Text>
        </View>
      </View>

      <View style={{ marginTop: 'auto' }}>
        <Button label="Continue" onPress={() => router.replace('/(app)/(tabs)/wallet')} />
      </View>
    </Screen>
  );
}
