import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: theme.colors.bgSecondary, borderRadius: theme.radii.md, borderColor: theme.colors.border }, style]}>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({ base: { padding: 14, paddingHorizontal: 16, borderWidth: 1 } });
