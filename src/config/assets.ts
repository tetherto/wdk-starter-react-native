import { NetworkType } from '@/services/wdk-service/types';

export interface AssetConfig {
  name: string;
  icon: any;
  color: string;
  priceUSD: number;
  supportedNetworks: NetworkType[];
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  amount: string;
  value: string;
  icon: string | any;
  color: string;
}

export const assetConfig: Record<string, AssetConfig> = {
  btc: {
    name: 'Bitcoin',
    icon: require('../../assets/images/tokens/bitcoin-btc-logo.png'),
    color: '#ffffff',
    priceUSD: 97000, // Mock price - should come from API
    supportedNetworks: [NetworkType.SEGWIT, NetworkType.SPARK],
  },
  usdt: {
    name: 'USD₮',
    icon: require('../../assets/images/tokens/tether-usdt-logo.png'),
    color: '#ffffff',
    priceUSD: 1,
    supportedNetworks: [
      NetworkType.ETHEREUM,
      NetworkType.POLYGON,
      NetworkType.ARBITRUM,
      NetworkType.TON,
      NetworkType.TRON,
      NetworkType.SOLANA,
    ],
  },
  xaut: {
    name: 'XAU₮',
    icon: require('../../assets/images/tokens/tether-gold-xaut-logo.png'),
    color: '#ffffff',
    priceUSD: 2650, // Mock price for gold
    supportedNetworks: [NetworkType.ETHEREUM],
  },
};
