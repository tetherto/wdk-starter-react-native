import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import type { TypographyVariant, Palette } from '@/theme';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: keyof Palette;
  center?: boolean;
  mono?: boolean;
}

/**
 * Single text primitive — every string in the app renders through this.
 * Theme-aware AND screen-size-aware: font size and line height are moderately
 * scaled against the prototype's 380×720 design canvas (see
 * theme/responsive.ts), so text reads at a sensible size whether it's on a
 * small phone or a large Android device — instead of a fixed pt value
 * designed for one screen looking tiny on a bigger one.
 */
export function Text({ variant = 'body', color = 'textPrimary', center, mono, style, ...rest }: TextProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();

  const base = theme.typography[variant] as {
    fontSize: number;
    fontWeight: string;
    lineHeight?: number;
    letterSpacing?: number;
  };
  const fontSize = moderateScale(base.fontSize);
  // Keep the line-height : font-size ratio the design specified, scaled together.
  const lineHeight = base.lineHeight ? (fontSize / base.fontSize) * base.lineHeight : undefined;

  return (
    <RNText
      {...rest}
      style={[
        { ...base, fontSize, lineHeight },
        { color: theme.colors[color], fontFamily: mono ? theme.fonts.mono : undefined },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}
