import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { useToast } from '@/state/toast';
import { Text } from './Text';

const AUTO_HIDE_MS = 1800; // matches the prototype's toast timer exactly
const FADE_MS = 200; // matches the prototype's `transition: opacity 0.2s`

/**
 * Global toast — matches the prototype's single #toast element: a dark
 * pill, centered horizontally, anchored above the bottom of the screen,
 * with a clock icon, fading in/out rather than a native Alert dialog.
 * Mount this ONCE at the root (_layout.tsx) — any screen triggers it via
 * useToast().show('message').
 *
 * Centering: CSS's `left:50%; transform:translateX(-50%)` (used by the
 * prototype) has no direct RN equivalent — RN transforms don't support
 * percentages, only fixed values, which would be wrong for messages of
 * different lengths. Instead: a full-width, absolutely-positioned wrapper
 * with `alignItems:'center'`, letting the pill size itself naturally and
 * center via flexbox — the standard RN pattern for this, not a fixed-value
 * approximation.
 */
export function Toast() {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const message = useToast((s) => s.message);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    if (hideTimer.current) clearTimeout(hideTimer.current);

    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => useToast.getState().hide());
    }, AUTO_HIDE_MS);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [message, opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { bottom: moderateScale(90), opacity }]}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.textPrimary,
            borderRadius: theme.radii.lg,
            paddingVertical: moderateScale(11),
            paddingHorizontal: moderateScale(18),
          },
        ]}
      >
        <Clock size={moderateScale(14)} color={theme.colors.brand} style={styles.icon} />
        <Text variant="small" color="white">{message}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { marginRight: 6 },
});
