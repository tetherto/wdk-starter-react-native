// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import AsyncStorage from '@react-native-async-storage/async-storage';

const avatarOptions = [
  { id: 1, emoji: '₿', color: '#FF9500' },
  { id: 2, emoji: '💎', color: '#00D4FF' },
  { id: 3, emoji: '🌈', color: '#AF52DE' },
  { id: 4, emoji: '⚡', color: '#8E8E93' },
  { id: 5, emoji: '🟢', color: '#00C853' },
  { id: 6, emoji: '🔴', color: '#FF3B30' },
  { id: 7, emoji: '😎', color: '#FFCC00' },
  { id: 8, emoji: '👾', color: '#AF52DE' },
  { id: 9, emoji: '🎮', color: '#5856D6' },
  { id: 10, emoji: '🐻', color: '#8B6914' },
  { id: 11, emoji: '🚗', color: '#007AFF' },
  { id: 12, emoji: '😊', color: '#FFCC00' },
];

const STORAGE_KEY_AVATAR = 'wallet_avatar';
const STORAGE_KEY_WALLET_NAME = 'wallet_name';

export const getWalletName = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY_WALLET_NAME);
  return stored || 'My Wallet';
};

export const setWalletName = async (name: string) => {
  await AsyncStorage.setItem(STORAGE_KEY_WALLET_NAME, name);
};

export const clearWalletName = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY_WALLET_NAME);
};

export const getAvatar = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEY_AVATAR);
  if (stored) {
    return avatarOptions[parseInt(stored) - 1];
  }
  return avatarOptions[0];
};

export const setAvatar = async (avatar: number) => {
  await AsyncStorage.setItem(STORAGE_KEY_AVATAR, JSON.stringify(avatar));
};

export const clearAvatar = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY_AVATAR);
};

export default avatarOptions;
