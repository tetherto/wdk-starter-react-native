import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { WalletProvider, WDKService } from '@tetherto/wdk-react-native-provider';
import { ThemeProvider } from '@tetherto/wdk-uikit-react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import chains from '../config/chains.json';
import { pricingService } from '../services/pricing-service';

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

        // Initialize pricing service
        await pricingService.initialize();
        console.log('Pricing service initialized in app layout');
      } catch (error) {
        console.error('Failed to initialize services in app layout:', error);
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
        <WalletProvider
          config={{
            indexerApiKey: process.env.EXPO_PUBLIC_WDK_INDEXER_API_KEY!,
            chains: chains,
          }}
        >
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
