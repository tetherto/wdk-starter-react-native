import * as Keychain from 'react-native-keychain';

export const ensureDeviceAuthentication = async () => {
  const biometryType = await Keychain.getSupportedBiometryType();
  const accessControl = biometryType
    ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE
    : Keychain.ACCESS_CONTROL.DEVICE_PASSCODE;

  await Keychain.setGenericPassword('wdk', 'seed', {
    accessControl,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });

  const authResult = await Keychain.getGenericPassword({
    authenticationPrompt: {
      title: 'Use Face/Touch ID or device PIN',
      subtitle: 'Confirm your identity to continue',
    },
  });

  if (!authResult) {
    throw new Error('User not authenticated');
  }

  return true;
};
