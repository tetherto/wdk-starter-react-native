import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { Button } from './Button';

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.center}>
      <Text variant="h2" center>{title}</Text>
      {message ? <Text variant="body" color="textSecondary" center style={styles.gap}>{message}</Text> : null}
      {action ? <View style={styles.action}><Button label={action.label} onPress={action.onPress} variant="secondary" /></View> : null}
    </View>
  );
}
export function LoadingState({ message }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.bgPrimary }]}>
      <ActivityIndicator color={theme.colors.brand} />
      {message ? <Text variant="body" color="textSecondary" center style={styles.gap}>{message}</Text> : null}
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text variant="h2" center>Something went wrong</Text>
      <Text variant="body" color="textSecondary" center style={styles.gap}>{message}</Text>
      {onRetry ? <View style={styles.action}><Button label="Try again" onPress={onRetry} variant="secondary" /></View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  gap: { marginTop: 8, maxWidth: 300 },
  action: { marginTop: 16, alignSelf: 'stretch' },
});
