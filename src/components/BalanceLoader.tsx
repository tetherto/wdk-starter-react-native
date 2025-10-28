import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

export const BalanceLoader: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.text}>Loading balance...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 8,
  },
  text: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
});
