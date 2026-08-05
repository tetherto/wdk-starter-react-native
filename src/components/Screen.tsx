import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, SafeAreaProvider, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  noPadding?: boolean;
  edges?: Edge[];
}

/**
 * Standard screen container: themed background, safe-area aware, 20px padding.
 *
 * FIX for a real bug: screens presented as a native modal (e.g. send/receive,
 * both `presentation: 'fullScreenModal'` in _layout.tsx's Stack) don't
 * reliably inherit safe-area insets from the app-level SafeAreaProvider on
 * iOS — confirmed as a known, documented issue directly in
 * react-native-safe-area-context's own GitHub repo (their README explicitly
 * says to add a SafeAreaProvider "at the root of modals and routes", not
 * just once at the app root). Symptom: the header/back button renders under
 * the status bar specifically on modal-presented screens, while regular
 * pushed screens are unaffected. Wrapping every Screen in its own
 * SafeAreaProvider (cheap — it's just a context provider, not a real native
 * view) re-establishes correct insets regardless of how the screen was
 * presented, fixing this for every current and future screen rather than
 * patching each modal screen individually.
 *
 * Wrapped in KeyboardAvoidingView so any screen with a TextField (password,
 * unlock, import, etc.) automatically pushes its content above the keyboard
 * instead of letting the keyboard cover it — this is a Screen-level fix, not
 * per-screen, so every current and future screen using Screen gets it for
 * free. iOS uses 'padding' (shrinks available space, standard iOS pattern);
 * Android uses 'height' (resizes the view). If you have edge-to-edge enabled
 * on Android, double-check this still behaves correctly there — edge-to-edge
 * can interact with the OS's own keyboard-resize handling, which is why we
 * handle it explicitly here rather than relying solely on
 * android:windowSoftInputMode.
 */
export function Screen({ children, scroll, noPadding, edges = ['top', 'bottom'] }: ScreenProps) {
  const theme = useTheme();
  const padding = noPadding
    ? {}
    : {
        paddingHorizontal: theme.layout.screenPaddingH,
        paddingTop: theme.layout.screenPaddingTop,
        paddingBottom: theme.layout.screenPaddingBottom,
      };

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.grow, padding]}
      showsVerticalScrollIndicator={false}
      // "always" rather than "handled" — a real bug on Send Amount
      // specifically: Scan sits right next to an actively-focused text
      // input, and on iOS the FIRST tap on a nearby button can get consumed
      // by dismissing the keyboard instead of firing onPress, even with
      // "handled" set. "always" removes that ambiguity entirely — every
      // tap passes through to its target regardless of keyboard/focus state.
      keyboardShouldPersistTaps="always"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding]}>{children}</View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.bgPrimary }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {inner}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
