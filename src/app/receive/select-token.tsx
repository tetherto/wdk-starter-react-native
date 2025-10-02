import { assetConfig } from '@/config/assets';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../contexts/wallet-context';

interface Token {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  color: string;
}

const RECENT_RECEIVE_TOKENS_KEY = 'recent_receive_tokens';
const MAX_RECENT_TOKENS = 4;

const saveRecentTokens = async (tokens: string[]) => {
  try {
    await AsyncStorage.setItem(RECENT_RECEIVE_TOKENS_KEY, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error saving recent receive tokens:', error);
  }
};

const getRecentTokens = async (): Promise<string[]> => {
  try {
    const tokens = await AsyncStorage.getItem(RECENT_RECEIVE_TOKENS_KEY);
    return tokens ? JSON.parse(tokens) : [];
  } catch (error) {
    console.error('Error loading recent receive tokens:', error);
    return [];
  }
};

const addToRecentTokens = async (tokenName: string) => {
  try {
    const current = await getRecentTokens();
    const filtered = current.filter(name => name !== tokenName);
    const updated = [tokenName, ...filtered].slice(0, MAX_RECENT_TOKENS);
    await saveRecentTokens(updated);
    return updated;
  } catch (error) {
    console.error('Error adding to recent receive tokens:', error);
    return [];
  }
};

export default function ReceiveSelectTokenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { wallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTokens, setRecentTokens] = useState<string[]>([]);

  useEffect(() => {
    const loadRecentTokens = async () => {
      const recent = await getRecentTokens();
      setRecentTokens(recent);
    };
    loadRecentTokens();
  }, []);

  // Create token list from enabled assets
  const tokens: Token[] = useMemo(() => {
    if (!wallet?.enabledAssets) {
      return [];
    }

    return wallet.enabledAssets
      .map(assetSymbol => {
        const config = assetConfig[assetSymbol as keyof typeof assetConfig];
        if (!config) return null;

        return {
          id: assetSymbol,
          symbol:
            assetSymbol === 'usdt'
              ? 'USD₮'
              : assetSymbol === 'xaut'
                ? 'XAU₮'
                : assetSymbol.toUpperCase(),
          name: config.name,
          icon: config.icon,
          color: config.color,
        };
      })
      .filter(Boolean) as Token[];
  }, [wallet?.enabledAssets]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      token =>
        token.name.toLowerCase().includes(query) || token.symbol.toLowerCase().includes(query)
    );
  }, [searchQuery, tokens]);

  const handleSelectToken = useCallback(
    async (token: Token) => {
      // Save token to recent tokens
      const updatedRecent = await addToRecentTokens(token.name);
      setRecentTokens(updatedRecent);

      // Check if token has multiple supported networks
      const tokenConfig = assetConfig[token.id];
      if (tokenConfig && tokenConfig.supportedNetworks.length > 1) {
        router.push({
          pathname: '/receive/select-network',
          params: {
            tokenId: token.id,
            tokenSymbol: token.symbol,
            tokenName: token.name,
          },
        });
      } else {
        // For single-chain tokens, go directly to QR code
        router.push({
          pathname: '/receive/details',
          params: {
            tokenId: token.id,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            network: token.name,
          },
        });
      }
    },
    [router]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const renderRecentToken = ({ item }: { item: string }) => {
    const token = tokens.find(t => t.name === item);
    if (!token) return null;

    return (
      <TouchableOpacity
        style={styles.recentToken}
        onPress={() => handleSelectToken(token)}
        activeOpacity={0.7}
      >
        <View style={[styles.recentTokenIcon, { backgroundColor: token.color }]}>
          <Image source={token.icon} style={styles.recentTokenIconImage} />
        </View>
        <Text style={styles.recentTokenName}>{token.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderToken = ({ item }: { item: Token }) => {
    return (
      <TouchableOpacity
        style={styles.tokenRow}
        onPress={() => handleSelectToken(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tokenInfo}>
          <View style={[styles.tokenIcon, { backgroundColor: item.color }]}>
            <Image source={item.icon} style={styles.tokenIconImage} />
          </View>
          <View>
            <Text style={styles.tokenName}>{item.name}</Text>
            <Text style={styles.tokenSymbol}>({item.symbol})</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive funds</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={clearSearch}>
            <X size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {!searchQuery && recentTokens && recentTokens.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentTokensContainer}
          >
            {recentTokens.map(tokenName => {
              const token = tokens.find(t => t.name === tokenName);
              if (!token) return null;
              return (
                <TouchableOpacity
                  key={token.id}
                  style={styles.recentToken}
                  onPress={() => handleSelectToken(token)}
                >
                  <View style={[styles.recentTokenIcon, { backgroundColor: token.color }]}>
                    <Image source={token.icon} style={styles.recentTokenIconImage} />
                  </View>
                  <Text style={styles.recentTokenName}>{token.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.tokensSection}>
        <Text style={styles.sectionTitle}>All tokens</Text>
        {filteredTokens.length > 0 ? (
          <FlatList
            data={filteredTokens}
            renderItem={renderToken}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tokensList}
          />
        ) : (
          <View style={styles.noTokensContainer}>
            <Text style={styles.noTokensText}>No tokens found matching your search</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6501',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
  },
  recentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
    marginLeft: 20,
    marginBottom: 12,
  },
  recentTokensContainer: {
    paddingHorizontal: 20,
  },
  recentToken: {
    alignItems: 'center',
    marginRight: 20,
  },
  recentTokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recentTokenIconImage: {
    width: 28,
    height: 28,
  },
  recentTokenName: {
    fontSize: 12,
    color: '#fff',
  },
  tokensSection: {
    flex: 1,
  },
  tokensList: {
    paddingBottom: 20,
  },
  tokenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tokenIconImage: {
    width: 24,
    height: 24,
  },
  tokenName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  tokenSymbol: {
    fontSize: 12,
    color: '#999',
  },
  noTokensContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTokensText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
