import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';
import type { TypographyVariant, Palette } from '@/theme';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: keyof Palette;
  center?: boolean;
  mono?: boolean;
}

/** Single text primitive — every string renders through this. Theme-aware. */
export function Text({ variant = 'body', color = 'textPrimary', center, mono, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant] as object,
        { color: theme.colors[color], fontFamily: mono ? theme.fonts.mono : undefined },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
