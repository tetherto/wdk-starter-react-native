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

import { NetworkType } from '@tetherto/wdk-react-native-provider';

export interface Network {
  id: string;
  name: string;
  gasLevel: 'High' | 'Normal' | 'Low';
  gasColor: string;
  icon: string | any;
  color: string;
}

export const networkConfigs: Record<NetworkType, Network> = {
  [NetworkType.ETHEREUM]: {
    id: 'ethereum',
    name: 'Ethereum',
    gasLevel: 'High',
    gasColor: '#FF3B30',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
  },
  [NetworkType.POLYGON]: {
    id: 'polygon',
    name: 'Polygon',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/polygon-matic-logo.png'),
    color: '#8247E5',
  },
  [NetworkType.ARBITRUM]: {
    id: 'arbitrum',
    name: 'Arbitrum',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    icon: require('../../assets/images/chains/arbitrum-arb-logo.png'),
    color: '#28A0F0',
  },
  [NetworkType.TON]: {
    id: 'ton',
    name: 'TON',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/ton-logo.png'),
    color: '#0088CC',
  },
  [NetworkType.TRON]: {
    id: 'tron',
    name: 'Tron',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/tron-trx-logo.png'),
    color: '#FF060A',
  },
  [NetworkType.SOLANA]: {
    id: 'solana',
    name: 'Solana',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/solana-sol-logo.png'),
    color: '#9945FF',
  },
  [NetworkType.SEGWIT]: {
    id: 'bitcoin',
    name: 'Bitcoin',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
  },
  [NetworkType.LIGHTNING]: {
    id: 'lightning',
    name: 'Lightning',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/lightning-logo.png'),
    color: '#F7CA3E',
  },
};
