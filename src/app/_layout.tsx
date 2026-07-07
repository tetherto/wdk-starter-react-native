import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { ThemeProvider, useTheme } from '@/theme';
import { useSession } from '@/state/session';

/**
 * Edge-to-edge is mandatory on Android in SDK 55, so the app already draws
 * behind the system bars. This makes the Android navigation bar transparent
 * (button style follows the theme) so the app background flows seamlessly to
 * the screen edges. Content stays clear of the bars via SafeAreaView in Screen.
 */
function useEdgeToEdge() {
  const theme = useTheme();
  useEffect(() => {
    (async () => {
      try {
        // Button/pill color follows the theme. Visibility (hidden) is set via
        // the expo-navigation-bar config plugin in app.json, which is the
        // reliable path under SDK 55 edge-to-edge (runtime setVisibilityAsync
        // is deprecated/unreliable there).
        await NavigationBar.setStyle(theme.mode === 'dark' ? 'light' : 'dark');
      } catch {}
    })();
  }, [theme.mode]);
}

function AutoLockGate() {
  const router = useRouter();
  const status = useSession((s) => s.status);
  const lock = useSession((s) => s.lock);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        lock();
      }
    });
    return () => sub.remove();
  }, [lock]);

  useEffect(() => {
    if (status === 'locked') {
      router.replace('/unlock');
    }
  }, [status, router]);

  return null;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AutoLockGate />
          <RootStack />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
