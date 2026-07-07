import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react-native';
import { Screen, Text, Card, Button, ListItem, TokenIcon } from '@/components';
import { useTheme } from '@/theme';
import { mockWalletRepository } from '@/data/mock/mockWalletRepository';
import type { TokenBalance } from '@/domain/models';

const chainColor: Record<string, string> = { tron: '#FF060A', ethereum: '#627EEA', bitcoin: '#F7931A' };

export default function WalletHome() {
  const theme = useTheme();
  const router = useRouter();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  useEffect(() => { mockWalletRepository.getBalances('1').then(setBalances); }, []);

  return (
    <Screen noPadding edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPaddingH, paddingTop: theme.layout.screenPaddingTop }} showsVerticalScrollIndicator={false}>
        {/* Account switcher -> accounts screen */}
        <Pressable onPress={() => router.push('/accounts')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          <Text variant="headTitle">Account 1</Text>
          <ChevronDown size={18} color={theme.colors.textSecondary} />
        </Pressable>

        <Text variant="small" color="textSecondary">Total balance</Text>
        <Text variant="balance" style={{ marginTop: 4 }}>$1,997.32</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Button label="Send" icon={<ArrowUp size={18} color={theme.colors.white} />} onPress={() => router.push('/send')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Receive" variant="tinted" icon={<ArrowDown size={18} color={theme.colors.textPrimary} />} onPress={() => router.push('/receive')} />
          </View>
        </View>

        <Text variant="h2" style={{ marginBottom: 8 }}>Tokens</Text>
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {balances.map((b, i) => (
            <ListItem
              key={b.token.id}
              divider={i < balances.length - 1}
              leading={<TokenIcon color={chainColor[b.token.chain]} symbol={b.token.symbol[0]} badge={{ color: chainColor[b.token.chain], label: b.token.chain[0].toUpperCase() }} />}
              trailing={<Text variant="tokenName">{b.fiatValue}</Text>}
            >
              <Text variant="tokenName">{b.token.symbol}</Text>
              <Text variant="small" color="textSecondary">{b.amount} · {b.token.chain}</Text>
            </ListItem>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
