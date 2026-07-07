import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ListItemProps {
  leading?: React.ReactNode;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
}
export function ListItem({ leading, children, trailing, onPress, divider = true }: ListItemProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, divider && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
      {leading ? <View>{leading}</View> : null}
      <View style={styles.body}>{children}</View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  body: { flex: 1 },
  trailing: { alignItems: 'flex-end' },
});
