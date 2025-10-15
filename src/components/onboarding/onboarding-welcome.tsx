import { Download, Wallet } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
                  <Wallet size={20} color={button.variant === 'filled' ? '#000' : '#FF6501'} />
                )}
                {button.iconName === 'download' && (
                  <Download size={20} color={button.variant === 'filled' ? '#000' : '#FF6501'} />
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
    backgroundColor: '#121212',
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
    color: '#fff',
    textAlign: 'left',
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
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
    borderColor: '#FF6501',
  },
  filledButton: {
    backgroundColor: '#FF6501',
    borderColor: '#FF6501',
  },
  tintedButton: {
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    borderColor: '#FF6501',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6501',
  },
  filledButtonText: {
    color: '#000',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
