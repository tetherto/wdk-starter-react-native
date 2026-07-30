import React from 'react';
import { View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Button } from '@/components';
import { useResponsive } from '@/theme/responsive';


// using a proper cropped asset (e.g. measure it in an image editor: w / h).
const LOGO_ASPECT_RATIO = 2.7;

// Logo never exceeds this width, even on tablets — prevents it from
// growing to dominate large screens just because wp(55) is a big number there.
const LOGO_MAX_WIDTH = 360;

export default function Welcome() {
  const router = useRouter();
  const { wp } = useResponsive();

  const logoWidth = Math.min(wp(55), LOGO_MAX_WIDTH);
  const logoHeight = logoWidth / LOGO_ASPECT_RATIO;

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 56 }}>
        <Image
          source={require('@/../assets/images/android-icon-foreground.png')}
          style={{ width: logoWidth, height: logoHeight}}
          resizeMode="contain"
        />
        <Text
          variant="body"
          color="textSecondary"
          center
          style={{ maxWidth: '85%', marginTop: 40 }}
        >
          Self-custodial. Multi-chain. Your keys, your coins.
        </Text>
      </View>

      <Button
        label="Create new wallet"
        onPress={() => router.push('/(onboarding)/seed-hidden')}
      />
      <Button
        label="Import existing wallet"
        variant="secondary"
        onPress={() => router.push('/(onboarding)/import')}
      />
    </Screen>
  );
}
