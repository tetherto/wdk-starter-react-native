import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';
import { Text } from './Text';

interface ScreenHeaderProps {
  title?: string;
  step?: string;
  onBack?: () => void;
  backStyle?: 'plain' | 'circle';
  right?: React.ReactNode;
}

/**
 * Standard screen header.
 *
 * IMPORTANT: this always renders exactly 3 children (back, middle, right) —
 * matching the prototype's `.head`, which always has a left icon, a middle
 * label, AND a trailing spacer/icon of the SAME width as the left icon, even
 * when there's no title/step. With `justify-content: space-between`, 3 items
 * where the outer two are equal width is what makes the middle one land dead
 * center. Dropping the third slot when there's no `right` (as an earlier
 * version of this file did) breaks centering — the label gets pushed to one
 * side instead of sitting in the middle. Never render only 2 children here.
 */
export function ScreenHeader({ title, step, onBack, backStyle = 'circle', right }: ScreenHeaderProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const boxSize = moderateScale(36);
  const iconSize = moderateScale(backStyle === 'circle' ? 18 : 22);

  const back = onBack ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onBack}
      style={[
        backStyle === 'circle'
          ? [styles.circle, { backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }]
          : styles.plain,
        { width: boxSize, height: boxSize, borderRadius: backStyle === 'circle' ? boxSize / 2 : 0 },
      ]}
    >
      <ChevronLeft size={iconSize} color={theme.colors.textPrimary} />
    </Pressable>
  ) : (
    <View style={{ width: boxSize }} />
  );

  const middle = title ? (
    <Text variant="headTitle">{title}</Text>
  ) : step ? (
    <Text variant="headStep" color="textSecondary">{step}</Text>
  ) : null;

  const rightSlot = right ?? <View style={{ width: boxSize }} />;

  return (
    <View style={styles.row}>
      {back}
      {middle}
      {rightSlot}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  circle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  plain: { alignItems: 'center', justifyContent: 'center' },
});
