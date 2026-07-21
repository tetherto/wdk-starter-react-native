import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { Text } from './Text';

interface SeedWordGridProps {
  /** Number of masked placeholder slots to show (e.g. before reveal). */
  count?: number;
  /** Actual words to show (e.g. after reveal). Overrides `count` when present. */
  words?: string[];
}

/**
 * The 12-word recovery-phrase grid, shared by seed-hidden (masked dots) and
 * seed-revealed (actual words) — same prototype `.grid2`/`.word` pattern, one
 * component so both screens stay visually identical and only diverge in data.
 *
 * Uses RN's native flexbox `gap` (RN 0.71+) for the 2-column layout rather
 * than manual width math. Gap, padding, and the number badge width are all
 * moderately scaled with screen width (useResponsive), consistent with
 * Text/Button/ScreenHeader — so the grid doesn't look cramped on a tablet or
 * overflow on a small phone.
 */
export function SeedWordGrid({ count = 12, words }: SeedWordGridProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();

  const gap = moderateScale(8);
  const itemPadding = moderateScale(12);
  const numWidth = moderateScale(18);

  const slots = words ?? Array.from({ length: count });

  return (
    <View style={[styles.grid, { gap, marginVertical: moderateScale(14) }]}>
      {slots.map((word, i) => (
        <View
          key={i}
          style={[
            styles.item,
            {
              gap: moderateScale(8),
              padding: itemPadding,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.bgSecondary,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text variant="label" style={{ minWidth: numWidth }}>{i + 1}</Text>
          {typeof word === 'string' ? (
            <Text variant="label">{word}</Text>
          ) : (
            <Text variant="label" color="textSecondary" style={{ letterSpacing: 2 }}>
              ••••••••
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { flexBasis: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
