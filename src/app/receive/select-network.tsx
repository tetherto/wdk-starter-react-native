import Header from '@/components/header';
import { useWallet, useWalletManager } from '@tetherto/wdk-react-native-core';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { filterNetworksByMode } from '@/services/network-mode-service';
import { TOKEN_UI_CONFIGS } from '@/config/token';
import { ChainConfig, CHAINS, getAddressType, NetworkId } from '@/config/chain';
import { useNetworkMode } from '@/hooks/use-network-mode';

type NetworkOption = ChainConfig & {
  address?: string;
  hasAddress: boolean;
  description?: string;
};

const NETWORK_DESCRIPTIONS: Record<string, string> = {
  ethereum: 'ERC20',
  polygon: 'Polygon Network',
  arbitrum: 'Arbitrum One',
  spark: 'Spark Network',
  plasma: 'Plasma Network',
  sepolia: 'Sepolia Testnet',
};

export default function ReceiveSelectNetworkScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { wallets, activeWalletId } = useWalletManager();
  const currentWalletId = activeWalletId || wallets[0]?.identifier || 'default';
  const { addresses, getAddress } = useWallet({ walletId: currentWalletId });
  const params = useLocalSearchParams();

  const { tokenId, tokenSymbol, tokenName } = params as {
    tokenId: string;
    tokenSymbol: string;
    tokenName: string;
  };

  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { mode: networkMode } = useNetworkMode();

  useEffect(() => {
    const fetchNetworks = async () => {
      const tokenConfig = TOKEN_UI_CONFIGS[tokenId];
      if (!tokenConfig) {
        setNetworks([]);
        setIsLoading(false);
        return;
      }

      const filteredNetworks = filterNetworksByMode(tokenConfig.supportedNetworks, networkMode);

      const networksWithAddresses = await Promise.all(
        filteredNetworks.map(async (networkId: NetworkId) => {
          const network = CHAINS[networkId];
          let address: string | undefined;

          const addressData = addresses?.[networkId];
          if (Array.isArray(addressData) && addressData[0]) {
            address = addressData[0];
          } else if (typeof addressData === 'string') {
            address = addressData;
          } else {
            try {
              const fetchedAddress = await getAddress(networkId, 0);
              if (fetchedAddress) {
                address = fetchedAddress;
              }
            } catch (err) {
              console.log(`Failed to get address for ${networkId}:`, err);
            }
          }

          return {
            ...network,
            name: network.name,
            address,
            hasAddress: Boolean(address),
            description: NETWORK_DESCRIPTIONS[network.id],
          };
        })
      );

      setNetworks(networksWithAddresses);
      setIsLoading(false);
    };

    fetchNetworks();
  }, [tokenId, addresses, getAddress, networkMode]);

  const handleSelectNetwork = useCallback(
    (network: NetworkOption) => {
      if (!network.hasAddress) {
        return;
      }

      router.push({
        pathname: '/receive/details',
        params: {
          tokenId,
          tokenSymbol,
          tokenName,
          networkId: network.id,
          networkName: network.name,
          address: network.address,
        },
      });
    },
    [router, tokenId, tokenSymbol, tokenName]
  );

  const renderNetwork = ({ item }: { item: NetworkOption }) => {
    const isDisabled = !item.hasAddress;

    return (
      <TouchableOpacity
        style={[styles.networkRow, isDisabled && styles.networkRowDisabled]}
        onPress={() => handleSelectNetwork(item)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.networkInfo}>
          <View
            style={[
              styles.networkIcon,
              { backgroundColor: item.color },
              isDisabled && styles.networkIconDisabled,
            ]}
          >
            {typeof item.icon === 'string' ? (
              <Text style={[styles.networkIconText, isDisabled && styles.networkIconTextDisabled]}>
                {item.icon}
              </Text>
            ) : (
              <Image
                source={item.icon}
                style={[styles.networkIconImage, isDisabled && styles.networkIconImageDisabled]}
              />
            )}
          </View>
          <View style={styles.networkDetails}>
            <View style={styles.networkNameRow}>
              <Text style={[styles.networkName, isDisabled && styles.networkNameDisabled]}>
                {item.name}
              </Text>
              {getAddressType(item.id) === 'Safe' && (
                <Text style={styles.accountTypeTag}>Safe</Text>
              )}
            </View>
            {item.description && (
              <Text
                style={[styles.networkDescription, isDisabled && styles.networkDescriptionDisabled]}
              >
                {item.description}
              </Text>
            )}
            {isDisabled && <Text style={styles.noAddressLabel}>Address not available</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Header title="Select network" style={styles.header} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading networks...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Select network" style={styles.header} />

      <View style={styles.description}>
        <Text style={styles.descriptionText}>
          Select the network you will be using to receive {tokenName}
        </Text>
      </View>

      <FlatList
        data={networks}
        renderItem={renderNetwork}
        keyExtractor={(item) => item.id}
        style={styles.networksList}
        contentContainerStyle={styles.networksContent}
        showsVerticalScrollIndicator={false}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
  description: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  networksList: {
    flex: 1,
  },
  networksContent: {
    paddingBottom: 20,
  },
  networkRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  networkRowDisabled: {
    opacity: 0.5,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  networkIconDisabled: {
    backgroundColor: colors.border,
  },
  networkIconText: {
    fontSize: 18,
    color: colors.white,
  },
  networkIconTextDisabled: {
    opacity: 0.6,
  },
  networkIconImage: {
    width: 24,
    height: 24,
  },
  networkIconImageDisabled: {
    opacity: 0.6,
  },
  networkDetails: {
    flex: 1,
  },
  networkNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  networkNameDisabled: {
    color: colors.textTertiary,
  },
  accountTypeTag: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  networkDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  networkDescriptionDisabled: {
    color: colors.textDisabled,
  },
  noAddressLabel: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
