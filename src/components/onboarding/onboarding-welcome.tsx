import { Download, Wallet } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';

interface ActionButton {
  id: number;
  title: string;
  iconName: string;
  variant: 'filled' | 'tinted';
  onPress: () => void;
}

interface Props {
  title: string;
  subtitle: string;
  actionButtons: ActionButton[];
}

export const OnBoardingWelcome: React.FC<Props> = ({ title, subtitle, actionButtons }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../../assets/images/wdk-logo.png')}
            style={styles.wdkLogo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.actionButtonsContainer}>
          {actionButtons.map(button => (
            <TouchableOpacity
              key={button.id}
              style={[
                styles.actionButton,
                button.variant === 'filled' && styles.filledButton,
                button.variant === 'tinted' && styles.tintedButton,
              ]}
              onPress={button.onPress}
            >
              <View style={styles.buttonContent}>
                {button.iconName === 'wallet' && (
                  <Wallet
                    size={20}
                    color={button.variant === 'filled' ? colors.black : colors.primary}
                  />
                )}
                {button.iconName === 'download' && (
                  <Download
                    size={20}
                    color={button.variant === 'filled' ? colors.black : colors.primary}
                  />
                )}
                <Text
                  style={[
                    styles.actionButtonText,
                    button.variant === 'filled' && styles.filledButtonText,
                  ]}
                >
                  {button.title}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  wdkLogo: {
    width: 280,
    height: 280,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 48,
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  filledButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tintedButton: {
    backgroundColor: colors.tintedBackground,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  filledButtonText: {
    color: colors.black,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
