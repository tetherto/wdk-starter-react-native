import { useTheme } from '@tetherto/wdk-uikit-react-native';
import { Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface NetworkSelectorProps {
  networks: Network[];
  onSelectNetwork: (network: Network) => void;
}

export interface Network {
  id: string;
  name: string;
  gasLevel: 'High' | 'Normal' | 'Low';
  gasColor: string;
  icon: string | any;
  color: string;
  balance: string;
  balanceFiat: string;
  fiatCurrency: string;
  token: string;
}

export function NetworkSelector({ networks, onSelectNetwork }: NetworkSelectorProps) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNetworks = useMemo(() => {
    if (!searchQuery) return networks;
    const query = searchQuery.toLowerCase();
    return networks.filter(network => network.name.toLowerCase().includes(query));
  }, [searchQuery, networks]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        searchContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.borderRadius.md,
        },
        searchInput: {
          flex: 1,
          marginLeft: theme.spacing.xs,
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.text,
        },
        networksList: {
          paddingBottom: theme.spacing.lg,
        },
        networkRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          marginBottom: theme.spacing.xs,
        },
        networkInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          marginRight: theme.spacing.md,
        },
        networkIcon: {
          width: 40,
          height: 40,
          borderRadius: theme.borderRadius.full,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: theme.spacing.sm,
        },
        networkIconText: {
          fontSize: theme.typography.fontSize.lg,
          color: theme.colors.text,
        },
        networkIconImage: {
          width: 24,
          height: 24,
        },
        networkTextContainer: {
          flex: 1,
        },
        networkName: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.text,
          marginBottom: 2,
        },
        gasLevel: {
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
        },
        networkBalanceContainer: {
          alignItems: 'flex-end',
        },
        networkBalance: {
          fontSize: theme.typography.fontSize.md,
          fontWeight: theme.typography.fontWeight.medium,
          color: theme.colors.text,
          marginBottom: 2,
        },
        networkBalanceUSD: {
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        },
        disabledRow: {
          opacity: 0.5,
        },
        noNetworksContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 40,
        },
        noNetworksText: {
          fontSize: theme.typography.fontSize.md,
          color: theme.colors.textSecondary,
          textAlign: 'center',
        },
        ...theme.componentOverrides?.NetworkSelector,
      }),
    [theme]
  );

  const renderNetwork = ({ item }: { item: Network }) => {
    // Check if balance is zero
    const balanceValue = parseFloat(item.balance.replace(/,/g, ''));
    const isDisabled = balanceValue === 0;

    return (
      <TouchableOpacity
        style={[styles.networkRow, isDisabled && styles.disabledRow]}
        onPress={() => !isDisabled && onSelectNetwork(item)}
        disabled={isDisabled}
        activeOpacity={isDisabled ? 1 : 0.7}
      >
        <View style={styles.networkInfo}>
          <View style={[styles.networkIcon, { backgroundColor: item.color }]}>
            {typeof item.icon === 'string' ? (
              <Text style={styles.networkIconText}>{item.icon}</Text>
            ) : (
              <Image source={item.icon} style={styles.networkIconImage} />
            )}
          </View>
          <View style={styles.networkTextContainer}>
            <Text style={styles.networkName}>{item.name}</Text>
            <Text style={[styles.gasLevel, { color: item.gasColor }]}>
              {item.gasLevel} Gas fees
            </Text>
          </View>
        </View>
        {item.balance && item.balanceFiat && (
          <View style={styles.networkBalanceContainer}>
            <Text style={styles.networkBalance}>
              {item.balance} {item.token}
            </Text>
            <Text style={styles.networkBalanceUSD}>
              {item.balanceFiat} {item.fiatCurrency}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor={theme.colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={clearSearch}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {filteredNetworks.length > 0 ? (
        <FlatList
          data={filteredNetworks}
          renderItem={renderNetwork}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.networksList}
        />
      ) : (
        <View style={styles.noNetworksContainer}>
          <Text style={styles.noNetworksText}>No networks found matching your search</Text>
        </View>
      )}
    </>
  );
}
