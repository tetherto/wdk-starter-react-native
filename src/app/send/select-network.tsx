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

import { Network, NetworkSelector } from '@/components/NetworkSelector';
import { assetConfig } from '@/config/assets';
import { networkConfigs } from '@/config/networks';
import formatAmount from '@/utils/format-amount';
import { AssetTicker, useWallet } from '@tetherto/wdk-react-native-provider';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FiatCurrency, pricingService } from '@/services/pricing-service';
import getDisplaySymbol from '@/utils/get-display-symbol';
import formatTokenAmount from '@/utils/format-token-amount';
import Header from '@/components/header';
import { colors } from '@/constants/colors';

export default function SelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();
  const { balances } = useWallet();
  const { tokenId, tokenSymbol, tokenName, scannedAddress } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
    scannedAddress?: string;
  };

  const [networks, setNetworks] = useState<Network[]>([]);

  // Calculate networks with balances and fiat values
  useEffect(() => {
    const calculateNetworks = async () => {
      const tokenConfig = assetConfig[tokenId];

      if (!tokenConfig) {
        setNetworks([]);
        return;
      }

      const networksWithBalances = await Promise.all(
        tokenConfig.supportedNetworks.map(async networkType => {
          const network = networkConfigs[networkType];

          const balance = balances.list?.find(
            b => networkType === b.networkType && b.denomination === tokenId
          );

          const balanceValue = balance ? parseFloat(balance.value) : 0;

          // Calculate fiat value using pricing service
          const balanceUSD = await pricingService.getFiatValue(
            balanceValue,
            tokenId as AssetTicker,
            FiatCurrency.USD
          );

          return {
            ...network,
            balance: formatTokenAmount(balanceValue, tokenId as AssetTicker, false),
            balanceFiat: formatAmount(balanceUSD),
            fiatCurrency: FiatCurrency.USD,
            token: getDisplaySymbol(tokenId),
          };
        })
      );

      setNetworks(networksWithBalances);
    };

    calculateNetworks();
  }, [tokenId, balances.list]);

  const handleSelectNetwork = useCallback(
    (network: Network) => {
      router.push({
        pathname: '/send/details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          tokenBalance: network.balance,
          tokenBalanceUSD: network.balanceFiat,
          networkName: network.name,
          networkId: network.id,
          ...(scannedAddress && { scannedAddress }),
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName, scannedAddress]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Select network" style={styles.header} />

      <Text style={styles.description}>
        Select the network you will be using to send {tokenSymbol || tokenName}
      </Text>

      <NetworkSelector networks={networks} onSelectNetwork={handleSelectNetwork} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
});
