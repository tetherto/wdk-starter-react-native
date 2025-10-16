import { networkConfigs } from '@/config/networks';
import formatAmount from '@/utils/format-amount';
import formatTokenAmount from '@/utils/format-token-amount';
import formatUSDValue from '@/utils/format-usd-value';
import { AssetTicker, NetworkType } from '@tetherto/wdk-react-native-provider';
import { Send } from 'lucide-react-native';
import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TokenNetworkBalance {
  network: string;
  balance: number;
  usdValue: number;
  address: string;
}

interface TokenData {
  symbol: string;
  name: string;
  icon: any;
  color: string;
  totalBalance: number;
  totalUSDValue: number;
  networkBalances: TokenNetworkBalance[];
  priceUSD: number;
}

interface TokenDetailsProps {
  tokenData: TokenData;
  onSendPress?: (network?: NetworkType) => void;
}

export function TokenDetails({ tokenData, onSendPress }: TokenDetailsProps) {
  const handleSend = (network?: NetworkType) => {
    if (onSendPress) {
      onSendPress(network);
    } else {
      const networkName = network ? networkConfigs[network].name || network : 'any network';
      Alert.alert('Send Token', `Send ${tokenData.symbol} on ${networkName}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Total Token Balance */}
      <View style={styles.totalBalanceCard}>
        <View style={[styles.tokenIcon, { backgroundColor: tokenData.color }]}>
          {typeof tokenData.icon === 'string' ? (
            <Text style={styles.tokenIconText}>{tokenData.icon}</Text>
          ) : (
            <Image source={tokenData.icon} style={styles.tokenIconImage} />
          )}
        </View>
        <Text style={styles.totalLabel}>Total {tokenData.name} Balance</Text>
        <Text style={styles.totalAmount}>
          {formatTokenAmount(tokenData.totalBalance, tokenData.symbol as AssetTicker)}
        </Text>
        <Text style={styles.totalValue}>{formatUSDValue(tokenData.totalUSDValue)}</Text>
        {tokenData.priceUSD > 0 && (
          <Text style={styles.priceLabel}>
            ${formatAmount(tokenData.priceUSD)} per {tokenData.symbol}
          </Text>
        )}
      </View>

      {/* Network Breakdown */}
      {tokenData.networkBalances.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Available on Networks</Text>
          <ScrollView style={styles.networkList} showsVerticalScrollIndicator={false}>
            {tokenData.networkBalances.map((item, index) => {
              const networkName = networkConfigs[item.network as NetworkType]?.name || item.network;
              const networkColor = networkConfigs[item.network as NetworkType]?.color || '#999';

              return (
                <View key={`${item.network}-${index}`} style={styles.networkRow}>
                  <View style={styles.networkInfo}>
                    <View style={[styles.networkIcon, { backgroundColor: networkColor }]}>
                      <Image
                        source={networkConfigs[item.network as NetworkType]?.icon}
                        style={styles.tokenIconImage}
                      />
                    </View>
                    <View style={styles.networkDetails}>
                      <Text style={styles.networkName}>{networkName}</Text>
                      <Text style={styles.networkAddress}>
                        {item.address
                          ? `${item.address.slice(0, 6)}...${item.address.slice(-4)}`
                          : 'No address'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.networkBalance}>
                    <Text style={styles.networkAmount}>
                      {formatTokenAmount(item.balance, tokenData.symbol as AssetTicker)}
                    </Text>
                    <Text style={styles.networkValue}>{formatUSDValue(item.usdValue)}</Text>
                  </View>

                  {item.balance > 0 && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={() => handleSend(item.network as NetworkType)}
                    >
                      <Send size={16} color="#FF6501" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <View style={styles.noBalanceContainer}>
          <Text style={styles.noBalanceText}>No {tokenData.name} balance found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  totalBalanceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  tokenIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tokenIconText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  tokenIconImage: {
    width: 24,
    height: 24,
  },
  totalLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  networkList: {
    flex: 1,
    marginBottom: 20,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  networkIconText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  networkDetails: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  networkAddress: {
    fontSize: 12,
    color: '#666',
  },
  networkBalance: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  networkAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  networkValue: {
    fontSize: 12,
    color: '#999',
  },
  sendButton: {
    padding: 8,
  },
  noBalanceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBalanceText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF6501',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6501',
  },
  secondaryButtonText: {
    color: '#FF6501',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sendAllButton: {
    backgroundColor: '#26A17B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  sendAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
