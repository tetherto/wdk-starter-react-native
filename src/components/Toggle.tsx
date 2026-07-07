import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: value ? theme.colors.brand : theme.colors.border }]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 999, justifyContent: 'center' },
  knob: { position: 'absolute', top: 3, left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  knobOn: { transform: [{ translateX: 20 }] },
});
