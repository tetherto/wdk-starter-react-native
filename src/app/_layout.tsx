import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { WdkAppProvider } from '@tetherto/wdk-react-native-core';
import { ThemeProvider, useTheme } from '@/theme';
import { wdkConfigs } from '@/wdk/config';
// Generated worklet bundle (produced by `wdk-worklet-bundler generate`).
import wdkBundle from '../../.wdk-bundle/wdk-worklet.bundle.js';
import AutoLockOnBackground from '@/wdk/hooks/AutoLockOnBackground';
import { WdkSessionGate } from '@/wdk/hooks/WdkSessionGate';

function useEdgeToEdge() {
  const theme = useTheme();
  useEffect(() => {
    (async () => {
      try {
        await NavigationBar.setStyle(theme.mode === 'dark' ? 'light' : 'dark');
      } catch {}
    })();
  }, [theme.mode]);
}

function RootStack() {
  const theme = useTheme();
  useEdgeToEdge();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bgPrimary },
      }}
    >
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="unlock" />
      <Stack.Screen name="send" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="receive" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="accounts" />
      <Stack.Screen name="tx" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <WdkAppProvider wdkConfigs={wdkConfigs} bundle={{ bundle: wdkBundle as string }}>
      <AutoLockOnBackground />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <WdkSessionGate />
            <RootStack />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </WdkAppProvider>
  );
}
