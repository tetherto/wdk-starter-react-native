import { useWdkApp } from '@tetherto/wdk-react-native-core';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
export default function AppLayout() {
  const { state } = useWdkApp();
  useEffect(() => console.log('[WDK] status:', state.status), [state.status]);
  return <Stack screenOptions={{ headerShown: false }} />;
}
