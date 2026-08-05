import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function Pill({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, {
        borderRadius: theme.radii.lg,
        backgroundColor: active ? theme.colors.brandTint : theme.colors.bgSecondary,
        borderColor: active ? 'transparent' : theme.colors.border,
      }]}
    >
      <Text variant="body" color={active ? 'brand' : 'textSecondary'} style={styles.text}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  pill: { paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, alignSelf: 'flex-start' },
  text: { fontWeight: '500' },
});
