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

import type { TokenConfigs } from '@tetherto/wdk-react-native-core';
import { NetworkMode } from '@/services/network-mode-service';

const MAINNET_NETWORKS: string[] = ['ethereum', 'polygon', 'arbitrum', 'spark', 'plasma'];
const TESTNET_NETWORKS: string[] = ['sepolia', 'spark'];

const ALL_TOKEN_CONFIGS: TokenConfigs = {
  sepolia: {
    native: { address: null, symbol: 'ETH', name: 'Sepolia ETH', decimals: 18 },
    tokens: [
      { address: '0xd077a400968890eacc75cdc901f0356c943e4fdb', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    ],
  },
  plasma: {
    native: { address: null, symbol: 'ETH', name: 'Plasma ETH', decimals: 18 },
    tokens: [],
  },
  spark: {
    native: { address: null, symbol: 'BTC', name: 'Bitcoin', decimals: 8 },
    tokens: [],
  },
  ethereum: {
    native: { address: null, symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    tokens: [
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { address: '0x68749665FF8D2d112Fa859AA293F07A622782F38', symbol: 'XAUT', name: 'Tether Gold', decimals: 6 },
    ],
  },
  arbitrum: {
    native: { address: null, symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    tokens: [
      { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    ],
  },
  polygon: {
    native: { address: null, symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    tokens: [
      { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    ],
  },
};

const getTokenConfigs = (networkMode?: NetworkMode): TokenConfigs => {
  if (!networkMode) {
    return ALL_TOKEN_CONFIGS;
  }

  const allowedNetworks = networkMode === 'testnet' ? TESTNET_NETWORKS : MAINNET_NETWORKS;

  return Object.fromEntries(
    Object.entries(ALL_TOKEN_CONFIGS).filter(([key]) => allowedNetworks.includes(key))
  ) as TokenConfigs;
};

export default getTokenConfigs;
