import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Cloud } from 'lucide-react-native';
import { Screen, ScreenHeader, Text, Button } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';

/**
 * Cloud backup offer. Matches the prototype's `cloud-backup` screen exactly:
 * a centered hero (tinted circle + cloud icon), title, body, a small note
 * about password-based encryption, and two bottom-pinned buttons.
 *
 * This screen is purely the offer/intro — no backup actually happens here.
 * "Backup to cloud" goes to cloud-provider (where iCloud/Google Drive is
 * chosen and the real encrypt+upload happens); "manually" skips straight
 * into the app, matching the prototype's own flow.
 *
 * The wallet is already created + unlocked by WDK at this point
 * (seed-revealed / import + password). The session bridge has already set
 * status to 'unlocked'.
 */
export default function CloudBackup() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const enter = () => router.replace('/(app)/(tabs)/wallet');

  return (
    <Screen scroll>
      <ScreenHeader backStyle="plain" step="Step 4 of 4" onBack={() => router.back()} />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <View
          style={{
            width: moderateScale(88),
            height: moderateScale(88),
            borderRadius: moderateScale(44),
            backgroundColor: theme.colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Cloud size={moderateScale(40)} color={theme.colors.brand} />
        </View>
        <Text variant="h1" center>Backup your wallet to the cloud</Text>
        <Text variant="body" color="textSecondary" center style={{ marginTop: 8 }}>
          Don't lose your wallet! Save an encrypted copy of your recovery phrase to your favorite cloud service.
        </Text>
      </View>

      <Text variant="small" color="textSecondary" center style={{ marginBottom: 16, lineHeight: moderateScale(12) * 1.5 }}>
        Your password is used to encrypt your seed phrase.
      </Text>

      <View style={{ marginTop: 'auto' }}>
        <Button label="Backup to cloud" onPress={() => router.push('/(onboarding)/cloud-provider')} />
        <Button label="I prefer to backup manually" variant="secondary" onPress={enter} />
      </View>
    </Screen>
  );
}
