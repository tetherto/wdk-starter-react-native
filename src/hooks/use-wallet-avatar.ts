import avatarOptions, { getAvatar } from '@/config/avatar-options';
import { useEffect, useState } from 'react';

const useWalletAvatar = () => {
  const [avatar, setAvatar] = useState<string>(avatarOptions[0].emoji);

  useEffect(() => {
    getAvatar().then(avatar => setAvatar(avatar.emoji));
  }, []);

  return avatar;
};

export default useWalletAvatar;
