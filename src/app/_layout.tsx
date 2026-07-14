import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { WdkAppProvider, useWdkApp } from '@tetherto/wdk-react-native-core';
import { ThemeProvider, useTheme } from '@/theme';
import { useSession } from '@/state/session';
import { RepositoriesProvider, queryClient } from '@/data';
import { wdkConfigs } from '@/wdk/config';
// Generated worklet bundle (produced by `wdk-worklet-bundler generate`).
import wdkBundle from '../../.wdk-bundle/wdk-worklet.bundle.js';


function WdkStatusLogger() {
  const { state } = useWdkApp();
  useEffect(() => {
    // Visible in Metro logs. Expect: INITIALIZING -> NO_WALLET (fresh install).
    console.log('[WDK] status:', state.status);
    if (state.status === 'ERROR') {
      console.warn('[WDK] init error:', state.error?.message);
    }
  }, [state]);
  return null;
}

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
    <WdkAppProvider wdkConfigs={wdkConfigs} bundle={{ bundle: wdkBundle as string }}>
      <WdkStatusLogger />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <RepositoriesProvider>
              <ThemeProvider>
                <AutoLockGate />
                <RootStack />
              </ThemeProvider>
            </RepositoriesProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </WdkAppProvider>
  );
}
