import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, LockIcon, LockKeyholeIcon } from 'lucide-react-native';
import { Screen, Text, Button, TextField } from '@/components';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useWalletActions } from '@/wdk/hooks/useWalletActions';
import { verifyAppPassword } from '@/wdk/passwordVault';
import { usePasswordSession } from '@/state/passwordSession';

// Must match welcome.tsx's LOGO_ASPECT_RATIO — same logo asset, smaller size.
const LOGO_ASPECT_RATIO = 2.79;
const LOGO_MAX_WIDTH = 360;

/**
 * Unlock — matches the prototype's `unlock` screen: centered hero (logo,
 * lock-circle icon, title, body), a password field, and a bottom-pinned
 * "Unlock wallet" button.
 */
export default function Unlock() {
  const router = useRouter();
  const theme = useTheme();
  const { wp, moderateScale } = useResponsive();
  const { unlock } = useWalletActions();
  const setSessionPassword = usePasswordSession((s) => s.setPassword);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoWidth = Math.min(wp(40), LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;

  const doUnlock = async () => {
    setError(null);
    if (!password) {
      setError('Enter your password');
      return;
    }
    setBusy(true);
    try {
      const valid = await verifyAppPassword(password);
      if (!valid) {
        setError('Incorrect password');
        return;
      }
      await unlock();
      setSessionPassword(password);
      router.replace('/(app)/(tabs)/wallet');
    } catch (e: any) {
      setError(e?.message ?? 'Unlock failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
        <Image
          source={require('@/../assets/images/wdk-logo.png')}
          style={{ width: logoWidth, height: logoHeight, alignSelf: 'center', marginBottom: 20 }}
          resizeMode="contain"
        />
        <View
          style={{
            width: moderateScale(72),
            height: moderateScale(72),
            borderRadius: moderateScale(36),
            backgroundColor: theme.colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            marginBottom: 20,
          }}
        >
          <LockKeyholeIcon size={moderateScale(34)} color={theme.colors.brand} />
        </View>
        <Text variant="h1" center>Welcome back</Text>
        <Text variant="body" color="textSecondary" center style={{ marginTop: 4 }}>
          Enter your password to unlock your wallet.
        </Text>
      </View>

      <TextField
        label="Password"
        placeholder="Enter password"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text variant="small" color="error" style={{ marginTop: 8 }}>{error}</Text> : null}

      <View style={{ marginTop: 'auto' }}>
        <Button label="Unlock wallet" onPress={doUnlock} loading={busy} disabled={!password} />
      </View>
    </Screen>
  );
}
