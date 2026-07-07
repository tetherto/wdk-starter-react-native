import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface TextFieldProps extends TextInputProps { label?: string; }

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? <Text variant="label" color="textSecondary" style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={theme.colors.textSecondary}
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.bgSecondary,
            borderRadius: theme.radii.sm,
            borderColor: focused ? theme.colors.brand : theme.colors.border,
            color: theme.colors.textPrimary,
          },
          style,
        ]}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  label: { marginTop: 14, marginBottom: 6 },
  input: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, fontSize: 16 },
});
