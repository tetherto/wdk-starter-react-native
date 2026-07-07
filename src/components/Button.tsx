import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'tinted';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

/** primary = filled brand; secondary = outlined; tinted = brand-tint fill. */
export function Button({ label, onPress, variant = 'primary', disabled, loading, icon }: ButtonProps) {
  const theme = useTheme();

  const bg = (pressed: boolean) => {
    if (disabled) return theme.colors.disabledBg;
    if (variant === 'primary') return pressed ? theme.colors.brandPressed : theme.colors.brand;
    if (variant === 'tinted') return pressed ? theme.colors.brandTintPressed : theme.colors.brandTint;
    return pressed ? theme.colors.pressed : 'transparent';
  };
  const labelColor = disabled
    ? 'textDisabled'
    : variant === 'primary' ? 'white'
    : variant === 'secondary' ? 'brand'
    : 'textPrimary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radii.md,
          backgroundColor: bg(pressed),
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderColor: theme.colors.border,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.brand} />
      ) : (
        <View style={styles.content}>
          {icon ? <View>{icon}</View> : null}
          <Text variant="button" color={labelColor as any} style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 16, marginTop: 8 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { textTransform: 'capitalize' },
});
