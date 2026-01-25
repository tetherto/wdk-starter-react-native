import avatarOptions from '@/config/avatar-options';
import { useWalletSwitcher } from '@/hooks/use-wallet-switcher';
import { useMemo } from 'react';

const useWalletAvatar = () => {
  const { activeWallet } = useWalletSwitcher();
  const avatar = useMemo(() => {
    const option =
      avatarOptions.find((item) => item.id === activeWallet?.avatarId) ?? avatarOptions[0];
    return option.emoji;
  }, [activeWallet?.avatarId]);

  return avatar;
};

export default useWalletAvatar;
