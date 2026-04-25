// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Crypto polyfill - MUST be first import before anything else
import 'react-native-get-random-values';

import { Buffer } from '@craftzdog/react-native-buffer';
// @ts-ignore
global.Buffer = Buffer as unknown as BufferConstructor;

import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { WdkAppProvider } from '@tetherto/wdk-react-native-core';
import { ThemeProvider } from '@tetherto/wdk-uikit-react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import getChainsConfig, { SparkNetworkMode } from '@/config/get-chains-config';
import getTokenConfigs from '@/config/get-token-configs';
import { Toaster } from 'sonner-native';
import { colors } from '@/constants/colors';
import { getNetworkMode, NetworkMode } from '@/services/network-mode-service';

SplashScreen.preventAutoHideAsync();

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

export default function RootLayout() {
  const [sparkNetwork, setSparkNetwork] = useState<SparkNetworkMode>('MAINNET');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('mainnet');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const mode = await getNetworkMode();
      setNetworkMode(mode);
      // Use REGTEST for testnet mode, MAINNET for mainnet
      setSparkNetwork(mode === 'testnet' ? 'REGTEST' : 'MAINNET');
      setIsReady(true);
      SplashScreen.hideAsync();
    };
    init();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        defaultMode="dark"
        brandConfig={{
          primaryColor: colors.primary,
        }}
      >
        <WdkAppProvider
          networkConfigs={getChainsConfig(sparkNetwork)}
          tokenConfigs={getTokenConfigs(networkMode)}
        >
          <NavigationThemeProvider value={CustomDarkTheme}>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <StatusBar style="light" />
            </View>
          </NavigationThemeProvider>
        </WdkAppProvider>
        <Toaster
          offset={90}
          toastOptions={{
            style: {
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
            },
            titleStyle: { color: colors.text },
            descriptionStyle: { color: colors.text },
          }}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
