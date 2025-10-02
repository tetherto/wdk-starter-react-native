import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export const BalanceLoader: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#FF6501" />
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
    color: '#999',
    marginLeft: 8,
  },
});
