import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface ScreenHeaderProps {
  title?: string;
  step?: string;
  onBack?: () => void;
  backStyle?: 'plain' | 'circle';
  right?: React.ReactNode;
}

export function ScreenHeader({ title, step, onBack, backStyle = 'circle', right }: ScreenHeaderProps) {
  const theme = useTheme();
  const back = onBack ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onBack}
      style={backStyle === 'circle'
        ? [styles.circle, { backgroundColor: theme.colors.bgSecondary, borderColor: theme.colors.border }]
        : styles.plain}
    >
      <ChevronLeft size={backStyle === 'circle' ? 18 : 22} color={theme.colors.textPrimary} />
    </Pressable>
  ) : <View style={styles.spacer} />;

  return (
    <View style={styles.row}>
      {back}
      {title ? <Text variant="headTitle">{title}</Text> : null}
      {step ? <Text variant="headStep" color="textSecondary">{step}</Text> : (right ?? <View style={styles.spacer} />)}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  circle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  plain: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  spacer: { width: 36 },
});
