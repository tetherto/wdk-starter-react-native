import * as Keychain from 'react-native-keychain';

const getMnemonicServiceName = (walletId: string) => `wdk-wallet-${walletId}`;

export const saveWalletMnemonic = async (walletId: string, mnemonic: string) => {
  await Keychain.setGenericPassword('wallet', mnemonic, {
    service: getMnemonicServiceName(walletId),
    accessControl: Keychain.ACCESS_CONTROL.DEVICE_PASSCODE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
};

export const getWalletMnemonic = async (walletId: string) => {
  const result = await Keychain.getGenericPassword({
    service: getMnemonicServiceName(walletId),
    authenticationPrompt: {
      title: 'Unlock wallet',
      subtitle: 'Confirm your identity to switch wallets',
    },
  });

  if (!result) {
    throw new Error('User not authenticated');
  }

  return result.password;
};

export const deleteWalletMnemonic = async (walletId: string) => {
  await Keychain.resetGenericPassword({ service: getMnemonicServiceName(walletId) });
};

export const resetWalletMnemonics = async (walletIds: string[]) => {
  await Promise.all(walletIds.map((walletId) => deleteWalletMnemonic(walletId)));
};
