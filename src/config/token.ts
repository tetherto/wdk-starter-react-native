import { TokenConfig, TokenConfigs } from '@tetherto/wdk-react-native-core';
import { NetworkId } from '@/config/chain';
import { FiatCurrency } from '@/services/pricing-service';

export interface TokenUiConfig {
  id: string;
  name: string;
  symbol: string;
  icon: any;
  color: string;
  supportedNetworks: NetworkId[];
}

// mapped by token symbols
export const TOKEN_UI_CONFIGS: Record<string, TokenUiConfig> = {
  btc: {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: require('../../assets/images/tokens/bitcoin-btc-logo.png'),
    color: '#ffffff',
    supportedNetworks: [NetworkId.SPARK, NetworkId.SPARK_REGTEST],
  },
  usdt: {
    id: 'usdt',
    name: 'USD₮',
    symbol: 'USD₮',
    icon: require('../../assets/images/tokens/tether-usdt-logo.png'),
    color: '#ffffff',
    supportedNetworks: [
      NetworkId.ETHEREUM,
      NetworkId.POLYGON,
      NetworkId.ARBITRUM,
      NetworkId.PLASMA,
      NetworkId.SEPOLIA,
    ],
  },
  xaut: {
    id: 'xaut',
    name: 'XAU₮',
    symbol: 'XAU₮',
    icon: require('../../assets/images/tokens/tether-xaut-logo.png'),
    color: '#ffffff',
    supportedNetworks: [NetworkId.ETHEREUM],
  },
  eth: {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    supportedNetworks: [
      NetworkId.ETHEREUM,
      NetworkId.ARBITRUM,
      NetworkId.SEPOLIA,
      NetworkId.PLASMA,
    ],
  },
  matic: {
    id: 'matic',
    name: 'Polygon',
    symbol: 'MATIC',
    icon: require('../../assets/images/chains/polygon-matic-logo.png'),
    color: '#8247E5',
    supportedNetworks: [NetworkId.POLYGON],
  },
};

// 3. Technical Configuration (WDK Format)
export const TOKENS: TokenConfigs = {
  [NetworkId.SEPOLIA]: {
    native: { address: null, symbol: 'ETH', name: 'Sepolia ETH', decimals: 18 },
    tokens: [
      {
        address: '0xd077a400968890eacc75cdc901f0356c943e4fdb',
        symbol: 'USDT',
        name: TOKEN_UI_CONFIGS.usdt.name,
        decimals: 6,
      },
    ],
  },
  [NetworkId.PLASMA]: {
    native: { address: null, symbol: 'ETH', name: 'Plasma ETH', decimals: 18 },
    tokens: [],
  },
  [NetworkId.SPARK]: {
    native: { address: null, symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    tokens: [],
  },
  [NetworkId.SPARK_REGTEST]: {
    native: { address: null, symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    tokens: [],
  },
  [NetworkId.ETHEREUM]: {
    native: { address: null, symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    tokens: [
      {
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        symbol: 'USDT',
        name: TOKEN_UI_CONFIGS.usdt.name,
        decimals: 6,
      },
      {
        address: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
        symbol: 'XAUT',
        name: TOKEN_UI_CONFIGS.xaut.name,
        decimals: 6,
      },
    ],
  },
  [NetworkId.ARBITRUM]: {
    native: { address: null, symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    tokens: [
      {
        address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        symbol: 'USDT',
        name: TOKEN_UI_CONFIGS.usdt.name,
        decimals: 6,
      },
    ],
  },
  [NetworkId.POLYGON]: {
    native: { address: null, symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    tokens: [
      {
        address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        symbol: 'USDT',
        name: TOKEN_UI_CONFIGS.usdt.name,
        decimals: 6,
      },
    ],
  },
};

export interface Asset {
  id: string;

  name: string;

  symbol: string;

  amount: string;

  fiatValue: number;

  fiatCurrency: FiatCurrency;

  icon: string | any;

  color: string;
}

export function getAssetTicker(token: TokenConfig | TokenUiConfig): string {
  // Standardize ticker lookup (e.g. handle wrapped tokens or special cases here)

  return token.symbol.toLowerCase();
}
