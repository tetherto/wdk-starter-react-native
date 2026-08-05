import React, { useState } from 'react';
import { Pressable, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Apple, HardDrive, ChevronRight } from 'lucide-react-native';
import { useWalletManager } from '@tetherto/wdk-react-native-core';
import { Screen, ScreenHeader, Text } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useCloudBackup, type CloudProvider } from '@/wdk/cloud-backup/CloudBackupContext';
import { encryptPayload } from '@/wdk/cloudBackupEncryption';
import { usePasswordSession } from '@/state/passwordSession';
import { getAppPassword } from '@/wdk/passwordVault';
import { useLockSuppression } from '@/state/lockSuppression';

type Stage = 'connecting' | 'reading' | 'encrypting' | 'uploading';

const STAGE_LABEL: Record<Stage, string> = {
  connecting: 'Connecting…',
  reading: 'Reading wallet…',
  encrypting: 'Encrypting backup…',
  uploading: 'Uploading to cloud…',
};

/**
 * Cloud provider — matches the prototype's `cloud-provider` screen.
 *
 * IMPORTANT: when authenticate() fails, we now show CloudBackupContext's
 * `lastError` — the SPECIFIC reason (e.g. "Google Sign-In error (code):
 * message", "Google Play Services not available", a config error, etc.) —
 * falling back to a generic message only if lastError is somehow empty.
 * A previous version always overwrote this with one fixed generic string
 * ("Could not sign in with Google"), which made it impossible to diagnose
 * real failures from what the person saw on screen.
 */
export default function CloudProvider() {
  const router = useRouter();
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const { authenticate, uploadBackup, lastError } = useCloudBackup();
  const { getMnemonic, getSeedAndEntropyFromMnemonic, activeWalletId } = useWalletManager();
  const sessionPassword = usePasswordSession((s) => s.password);
  const { suppress, release } = useLockSuppression();

  const [busyProvider, setBusyProvider] = useState<CloudProvider | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backupTo = async (provider: CloudProvider) => {
    setError(null);
    setBusyProvider(provider);
    suppress();
    try {
      setStage('connecting');
      const authed = await authenticate(provider);
      if (!authed) {
        setError(
          lastError ??
          (provider === 'icloud'
            ? 'Could not connect to iCloud.'
            : 'Could not sign in with Google.')
        );
        return;
      }

      if (!activeWalletId) {
        setError('No active wallet to back up.');
        return;
      }

      setStage('reading');
      const mnemonic = await getMnemonic(activeWalletId);
      if (!mnemonic) {
        setError('Could not read the wallet recovery phrase. Make sure the wallet is unlocked.');
        return;
      }

      const { encryptionKey, encryptedEntropyBuffer } =
        await getSeedAndEntropyFromMnemonic(mnemonic);

      const password = sessionPassword ?? (await getAppPassword());
      if (!password) {
        setError('Could not verify your app password. Please unlock the app again and retry.');
        return;
      }

      setStage('encrypting');
      const plaintext = JSON.stringify({ encryptionKey, encryptedEntropyBuffer });
      const encryptedPayload = await encryptPayload(plaintext, password);
      const payload = JSON.stringify(encryptedPayload);

      setStage('uploading');
      const result = await uploadBackup(payload, activeWalletId, provider);

      router.push({
        pathname: '/(onboarding)/cloud-backup-success',
        params: {
          provider,
          account: result?.cloudEmail ?? '',
        },
      });
    } catch (e: any) {
      setError(e?.message ?? lastError ?? 'Backup failed. Please try again.');
    } finally {
      setBusyProvider(null);
      setStage(null);
      release();
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader title="Cloud provider" onBack={() => router.back()} />
      <Text variant="body" color="textSecondary" style={{ marginBottom: 16 }}>
        Choose where to store your encrypted wallet backup.
      </Text>

      {/* Google Drive listed first — iCloud requires a CloudKit container
          setup (see docs/CLOUD_BACKUP.md), so it's a heavier prerequisite
          for whoever's testing/forking this than Google Drive's simpler
          OAuth-client setup. Ordering, not functionality, changed — both
          still work identically either way. */}
      <CloudOptionRow
        icon={<HardDrive size={moderateScale(22)} color={theme.colors.brand} />}
        title="Google Drive"
        subtitle="Back up to Google Drive"
        disabled={busyProvider !== null}
        onPress={() => backupTo('gdrive')}
      />
      <CloudOptionRow
        icon={<Apple size={moderateScale(22)} color={theme.colors.brand} />}
        title="iCloud"
        subtitle="Back up to Apple iCloud"
        disabled={busyProvider !== null}
        onPress={() => backupTo('icloud')}
      />

      {busyProvider && stage ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: moderateScale(10),
            padding: moderateScale(14),
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.bgSecondary,
            borderWidth: 1,
            borderColor: theme.colors.border,
            marginTop: 4,
          }}
        >
          <ActivityIndicator color={theme.colors.brand} />
          <Text variant="label">{STAGE_LABEL[stage]}</Text>
        </View>
      ) : null}

      {error ? (
        <Text variant="small" color="error" style={{ marginTop: 8 }}>{error}</Text>
      ) : null}
    </Screen>
  );
}

function CloudOptionRow({
  icon,
  title,
  subtitle,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: moderateScale(14),
        padding: moderateScale(14),
        paddingHorizontal: moderateScale(16),
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.bgSecondary,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: moderateScale(44),
          height: moderateScale(44),
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.brandTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="label">{title}</Text>
        <Text variant="small" color="textSecondary">{subtitle}</Text>
      </View>
      <ChevronRight size={moderateScale(18)} color={theme.colors.textSecondary} />
    </Pressable>
  );
}
