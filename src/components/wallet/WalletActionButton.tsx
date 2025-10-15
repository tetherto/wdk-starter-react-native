import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface WalletActionButtonProps {
  title: string;
  iconName: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function WalletActionButton({
  title,
  iconName,
  onPress,
  disabled = false,
  variant = 'primary',
}: WalletActionButtonProps) {
  const getButtonStyles = () => {
    const base = [styles.button];

    if (disabled) {
      base.push(styles.disabled);
    } else {
      switch (variant) {
        case 'primary':
          base.push(styles.primary);
          break;
        case 'secondary':
          base.push(styles.secondary);
          break;
        case 'danger':
          base.push(styles.danger);
          break;
      }
    }

    return base;
  };

  const getIconColor = () => {
    if (disabled) return '#888';

    switch (variant) {
      case 'primary':
        return '#007AFF';
      case 'secondary':
        return '#34C759';
      case 'danger':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  return (
    <Pressable style={getButtonStyles()} onPress={onPress} disabled={disabled}>
      <View style={styles.content}>
        <IconSymbol name={iconName} size={24} color={getIconColor()} />
        <ThemedText style={[styles.text, disabled && styles.disabledText]}>{title}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
  },
  primary: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  secondary: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  danger: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  disabled: {
    backgroundColor: 'rgba(100, 100, 100, 0.05)',
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledText: {
    color: '#888',
  },
});
