import React, { useState } from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { Text } from './Text';

interface TextFieldProps extends TextInputProps { label?: string; }

/**
 * Font size and padding are moderately scaled with screen width (useResponsive),
 * matching Text/Button/ScreenHeader/SeedWordGrid — so inputs stay proportionate
 * on a tablet instead of looking small relative to everything around them.
 */
export function TextField({ label, style, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const [focused, setFocused] = useState(false);

  return (
    <View>
      {label ? (
        <Text
          variant="label"
          color="textSecondary"
          style={{ marginTop: moderateScale(14), marginBottom: moderateScale(6) }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.colors.textSecondary}
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[
          {
            paddingVertical: moderateScale(10),
            paddingHorizontal: moderateScale(12),
            borderWidth: 1.5,
            fontSize: moderateScale(16),
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
