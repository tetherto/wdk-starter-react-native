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
 *
 * Mounted in MULTIPLE places, by design: once at the app root (_layout.tsx,
 * covers every regular screen), and again inside send/_layout.tsx and
 * receive/_layout.tsx specifically. Those two are presented as native
 * fullScreenModals (react-native-screens' own modal presentation), which is
 * a genuinely separate native layer from the root — a toast mounted only at
 * the root was silently invisible on iOS whenever send/receive were open,
 * even though its state was updating correctly underneath. Mounting an
 * additional instance INSIDE each modal's own nested Stack puts it in the
 * same native presentation as that screen, no cross-layer rendering needed.
 *
 * NOT wrapped in React Native's own <Modal> (an earlier version of this
 * file was) — that turned out to be the wrong fix for the above problem,
 * and since useToast is one shared store, every mounted instance becomes
 * visible at once; wrapping each in its own <Modal> would mean multiple
 * simultaneous RN Modals open together, which isn't reliably well-defined.
 * A plain absolutely-positioned View, mounted in the right place, is both
 * simpler and safer.
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
