import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
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
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.colors.bgPrimary }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
