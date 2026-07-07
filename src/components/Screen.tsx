import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  noPadding?: boolean;
  edges?: Edge[];
}

/** Standard screen container: themed background, safe-area aware, 20px padding. */
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
      {inner}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, grow: { flexGrow: 1 } });
