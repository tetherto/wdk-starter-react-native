import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface TokenIconProps {
  color: string;
  symbol?: string;
  size?: number;
  badge?: { color: string; label: string };
}
/** Circular token glyph + optional chain badge. */
export function TokenIcon({ color, symbol, size = 38, badge }: TokenIconProps) {
  const theme = useTheme();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      {symbol ? <Text color="white" style={{ fontWeight: '700', fontSize: size * 0.37 }}>{symbol}</Text> : null}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badge.color, borderColor: theme.colors.bgPrimary }]}>
          <Text color="white" style={styles.badgeText}>{badge.label}</Text>
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: -2, right: -2, width: 17, height: 17, borderRadius: 8.5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 9, fontWeight: '700' },
});
