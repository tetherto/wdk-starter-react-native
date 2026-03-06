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

import {
  validateEvmAddress,
  validateSparkAddress,
  AddressValidator,
} from '@/utils/address-validators';

export type NetworkType = 'ethereum' | 'polygon' | 'arbitrum' | 'spark' | 'plasma' | 'sepolia';
export type AccountType = 'Safe' | 'Native';

export interface Network {
  id: string;
  name: string;
  gasLevel: 'High' | 'Normal' | 'Low';
  gasColor: string;
  icon: string | any;
  color: string;
  accountType: AccountType; // 'Safe' for ERC-4337 smart contract accounts, 'Native' for regular addresses
  addressValidator?: AddressValidator;
  explorerUrl?: string;
  userOpExplorerUrl?: string;
}

export const networkConfigs: Record<NetworkType, Network> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    gasLevel: 'High',
    gasColor: '#FF3B30',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    accountType: 'Safe',
    addressValidator: validateEvmAddress,
    explorerUrl: 'https://etherscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/polygon-matic-logo.png'),
    color: '#8247E5',
    accountType: 'Safe',
    addressValidator: validateEvmAddress,
    explorerUrl: 'https://polygonscan.com/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    gasLevel: 'Normal',
    gasColor: '#FF9500',
    icon: require('../../assets/images/chains/arbitrum-arb-logo.png'),
    color: '#28A0F0',
    accountType: 'Safe',
    addressValidator: validateEvmAddress,
    explorerUrl: 'https://arbiscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
  },
  spark: {
    id: 'spark',
    name: 'Spark',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/bitcoin-btc-logo.png'),
    color: '#F7931A',
    accountType: 'Native',
    addressValidator: validateSparkAddress,
    explorerUrl: 'https://sparkscan.io/tx/',
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#00D4AA',
    accountType: 'Safe',
    addressValidator: validateEvmAddress,
    explorerUrl: 'https://plasma.to/tx/',
  },
  sepolia: {
    id: 'sepolia',
    name: 'Sepolia',
    gasLevel: 'Low',
    gasColor: '#34C759',
    icon: require('../../assets/images/chains/ethereum-eth-logo.png'),
    color: '#627EEA',
    accountType: 'Safe',
    addressValidator: validateEvmAddress,
    explorerUrl: 'https://sepolia.etherscan.io/tx/',
    userOpExplorerUrl: 'https://jiffyscan.xyz/userOpHash/',
  },
};
