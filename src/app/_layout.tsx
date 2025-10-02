import { WalletProvider } from '@/contexts/wallet-context';
import { WDKService } from '@/services/wdk-service';
import { Buffer } from '@craftzdog/react-native-buffer';
import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-reanimated';
import { ThemeProvider } from 'react-native-wdk-ui';

if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

// Set up stream polyfill
if (typeof global.process === 'undefined') {
  // @ts-ignore
  global.process = require('process');
}

// Initialize crypto polyfill after Buffer and process are available
if (typeof global.crypto === 'undefined') {
  try {
    const crypto = require('react-native-crypto');
    // @ts-ignore
    global.crypto = crypto;
  } catch (e) {
    console.warn('Failed to load crypto polyfill:', e);
  }
}

SplashScreen.preventAutoHideAsync();

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121212',
    card: '#121212',
  },
};

export default function RootLayout() {
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize WDK services early in app lifecycle
        await WDKService.initialize();
        console.log('WDK Services initialized in app layout');
      } catch (error) {
        console.error('Failed to initialize WDK services in app layout:', error);
      } finally {
        SplashScreen.hideAsync();
      }
    };

    initApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        defaultMode="dark"
        brandConfig={{
          primaryColor: '#FF6501',
        }}
      >
        <WalletProvider>
          <NavigationThemeProvider value={CustomDarkTheme}>
            <View style={{ flex: 1, backgroundColor: '#121212' }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#121212' },
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                  name="onboarding"
                  options={{
                    headerShown: false,
                    animation: 'none',
                  }}
                />
                <Stack.Screen name="wallet" options={{ headerShown: false }} />
                <Stack.Screen name="wallet-setup" options={{ headerShown: false }} />
                <Stack.Screen name="assets" options={{ headerShown: false }} />
                <Stack.Screen name="activity" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="light" />
            </View>
          </NavigationThemeProvider>
        </WalletProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
