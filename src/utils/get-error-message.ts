import parseWorkletError from './parse-worklet-error';

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  const workletError = parseWorkletError(error);
  if (workletError) return workletError.message;
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('biometric not enrolled')) {
      return 'Face/Touch ID is not enrolled. Enable biometrics or a device screen lock (PIN/password) and try again.';
    }
    if (error.message.toLowerCase().includes('no fingerprints enrolled')) {
      return 'No fingerprints are enrolled. Enable device biometrics or screen lock, then reinstall the app to refresh secure storage.';
    }
    if (error.message.toLowerCase().includes('user not authenticated')) {
      return 'Device security is required. Unlock your device or enable a PIN/biometric, then try again.';
    }
    if (
      error.message.toLowerCase().includes('keyguard') ||
      error.message.toLowerCase().includes('device is not secure') ||
      error.message.toLowerCase().includes('lock screen')
    ) {
      return 'Device lock is not set. Enable a screen lock (PIN/password) to continue.';
    }
    return error.message;
  }
  return fallbackMessage;
};

export default getErrorMessage;
