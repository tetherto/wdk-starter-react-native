import { HRPC as WdkManager } from '@wdk/bare';
import wdkWorkletBundle from '@wdk/bare/bundle/wdk-worklet.mobile.bundle.js';
import b4a from 'b4a';
import * as bip39 from 'bip39';
import Decimal from 'decimal.js';
import { PricingProvider } from 'lib-wallet-pricing-provider';
import { BitfinexPricingClient } from 'lib-wallet-pricing-provider-bitfinex-http';
import config from '../../config/chains.json';
import workletBundle from '../../wdk-secret-manager-worklet.bundle.js';
import { BareWorkletApi, InstanceEnum } from './bare-api';
import {
  AccountData,
  Address,
  AssetAddressMap,
  AssetBalanceMap,
  AssetTicker,
  FiatAmount,
  FiatCurrency,
  InitializeAccountParams,
  Jar,
  NetworkType,
  News,
  SecurityAlert,
  Suggestion,
  Transaction,
  Wallet,
} from './types';
import { wdkEncryptionSalt } from './wdk-encryption-salt';
import {
  WDK_STORAGE_ENTROPY,
  WDK_STORAGE_SALT,
  WDK_STORAGE_SEED,
  WdkSecretManagerStorage,
} from './wdk-secret-manager-storage';

const SMART_CONTRACT_BALANCE_ADDRESSES = {
  [AssetTicker.USDT]: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
  },
  [AssetTicker.XAUT]: {
    ethereum: '0x68749665FF8D2d112Fa859AA293F07A622782F38',
    polygon: '0xF1815bd50389c46847f0Bda824eC8da914045D14',
    arbitrum: '0x40461291347e1eCbb09499F3371D3f17f10d7159',
    ton: 'EQA1R_LuQCLHlMgOo1S4G7Y7W1cd0FrAkbA10Zq7rddKxi9k',
  },
};

const toNetwork = (n: NetworkType): string => {
  switch (n) {
    case NetworkType.SEGWIT:
      return 'bitcoin';
    case NetworkType.SPARK:
      return 'spark';
    case NetworkType.ETHEREUM:
      return 'ethereum';
    case NetworkType.TON:
      return 'ton';
    case NetworkType.POLYGON:
      return 'polygon';
    case NetworkType.ARBITRUM:
      return 'arbitrum';
    case NetworkType.SOLANA:
      return 'solana';
    case NetworkType.TRON:
      return 'tron';
    default:
      return 'bitcoin';
  }
};

interface WalletCache {
  wdk: WdkManager;
  data: Wallet;
  account: {
    [index: number]: AccountData;
  };
  transactions?: Transaction[];
  suggestions?: Suggestion[];
  news?: News[];
  securityAlerts?: SecurityAlert[];
  jars?: Jar[];
}

class WDKService {
  private static instance: WDKService;
  private walletManagerCache: Map<string, WalletCache> = new Map();
  private isInitialized = false;
  private wdkManager: WdkManager | null = null;
  private secretManager: any | null = null;
  private provider: PricingProvider | null = null;
  private fiatExchangeRateCache: Record<FiatCurrency, Record<AssetTicker, number>> = {
    [FiatCurrency.USD]: {
      [AssetTicker.BTC]: 100000,
      [AssetTicker.USDT]: 1,
      [AssetTicker.XAUT]: 0,
    },
  };

  private constructor() {}

  static getInstance(): WDKService {
    if (!WDKService.instance) {
      WDKService.instance = new WDKService();
    }
    return WDKService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing WDK services...');

      // Start both worklets
      BareWorkletApi.startWorklet(
        InstanceEnum.wdkSecretManager,
        '/secret.manager.worklet.bundle',
        workletBundle
      );
      BareWorkletApi.startWorklet(
        InstanceEnum.wdkManager,
        '/wdk.manager.worklet.bundle',
        wdkWorkletBundle
      );

      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify both HRPC instances are available
      this.secretManager = BareWorkletApi.hrpcInstances.wdkSecretManager;
      this.wdkManager = BareWorkletApi.hrpcInstances.wdkManager;

      if (!this.secretManager) {
        throw new Error('Failed to initialize WDK Secret Manager HRPC instance');
      }

      if (!this.wdkManager) {
        throw new Error('Failed to initialize WDK Manager HRPC instance');
      }

      const client = new BitfinexPricingClient();

      this.provider = new PricingProvider({
        client,
        priceCacheDurationMs: 1000 * 60 * 60, // 1 hour
      });

      this.fiatExchangeRateCache[FiatCurrency.USD] = {
        [AssetTicker.BTC]: await this.provider.getLastPrice(AssetTicker.BTC, FiatCurrency.USD),
        [AssetTicker.USDT]: 1,
        [AssetTicker.XAUT]: await this.provider.getLastPrice(AssetTicker.XAUT, FiatCurrency.USD),
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WDK services:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  // WDK API Methods
  async createSeed(params: { prf: Buffer | ArrayBuffer | string }): Promise<string> {
    try {
      const salt = wdkEncryptionSalt.generateWdkSalt(params.prf);
      const rpc = BareWorkletApi.hrpcInstances.wdkSecretManager;

      const workletStatus = await rpc.commandWorkletStart({
        enableDebugLogs: 0,
      });

      if (workletStatus.status === 'started') {
        const encryptedData = await rpc.commandGenerateAndEncrypt({
          passkey: params.prf,
          salt: b4a.toString(salt, 'hex'),
        });

        await WdkSecretManagerStorage.saveData(WDK_STORAGE_ENTROPY, encryptedData.encryptedEntropy);
        await WdkSecretManagerStorage.saveData(WDK_STORAGE_SEED, encryptedData.encryptedSeed);
        await WdkSecretManagerStorage.saveData(WDK_STORAGE_SALT, salt);

        const decryptedData = await rpc.commandDecrypt({
          passkey: params.prf,
          salt: b4a.toString(salt, 'hex'),
          encryptedData: encryptedData.encryptedEntropy,
        });
        const seed = bip39.entropyToMnemonic(b4a.from(decryptedData.result, 'hex') as Buffer);
        return seed;
      } else {
        throw new Error('Error while starting the worklet.');
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async importSeedPhrase(params: {
    prf: Buffer | ArrayBuffer | string;
    seedPhrase: string;
  }): Promise<boolean> {
    try {
      const salt = wdkEncryptionSalt.generateWdkSalt(params.prf);
      const rpc = BareWorkletApi.hrpcInstances.wdkSecretManager;

      const workletStatus = await rpc.commandWorkletStart({
        enableDebugLogs: 0,
      });

      if (workletStatus.status === 'started') {
        const encryptedData = await rpc.commandGenerateAndEncrypt({
          passkey: params.prf,
          salt: b4a.toString(salt, 'hex'),
          seedPhrase: params.seedPhrase,
        });

        await WdkSecretManagerStorage.saveData(WDK_STORAGE_ENTROPY, encryptedData.encryptedEntropy);
        await WdkSecretManagerStorage.saveData(WDK_STORAGE_SEED, encryptedData.encryptedSeed);
        await WdkSecretManagerStorage.saveData(WDK_STORAGE_SALT, salt);
      } else {
        throw new Error('Error while starting the worklet.');
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
    return true;
  }

  async retrieveSeed(passkey: Buffer | ArrayBuffer | string): Promise<string | null> {
    let encryptedEntropy: boolean | null | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> =
      null;
    let encryptedSeed: Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> | boolean | null =
      null;
    let salt: Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike> | boolean | null = null;

    if (await WdkSecretManagerStorage.hasKey(WDK_STORAGE_ENTROPY)) {
      encryptedEntropy = await WdkSecretManagerStorage.retrieveData(WDK_STORAGE_ENTROPY);
    }
    if (await WdkSecretManagerStorage.hasKey(WDK_STORAGE_SEED)) {
      encryptedSeed = await WdkSecretManagerStorage.retrieveData(WDK_STORAGE_SEED);
    }
    if (await WdkSecretManagerStorage.hasKey(WDK_STORAGE_SALT)) {
      salt = await WdkSecretManagerStorage.retrieveData(WDK_STORAGE_SALT);
    }

    if (!encryptedSeed || !encryptedEntropy || !salt) {
      console.info('Seed does not exists!');
      return null;
    }

    try {
      const rpc = BareWorkletApi.hrpcInstances.wdkSecretManager;
      const workletStatus = await rpc.commandWorkletStart({
        enableDebugLogs: 0,
      });

      if (workletStatus.status === 'started') {
        const decryptedData = await rpc.commandDecrypt({
          passkey: passkey,
          salt: b4a.toString(salt, 'hex'),
          encryptedData: b4a.toString(encryptedEntropy, 'hex'),
        });
        const seed = bip39.entropyToMnemonic(b4a.from(decryptedData.result, 'hex') as Buffer);
        return seed;
      } else {
        throw new Error('Error while starting the worklet.');
      }
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async getAssetAddress(network: NetworkType, index: number): Promise<{ address: string }> {
    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    if (network === NetworkType.SEGWIT || network === NetworkType.SPARK) {
      return await this.wdkManager.getAddress({
        network: toNetwork(network),
        accountIndex: index,
      });
    } else {
      return await this.wdkManager.getAbstractedAddress({
        network: toNetwork(network),
        accountIndex: index,
      });
    }
  }

  async resolveWalletAddresses(
    enabledAssets: AssetTicker[],
    index: number = 0
  ): Promise<Partial<Record<NetworkType, string>>> {
    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    const addressPromises = [];
    const networkAddresses: Partial<Record<NetworkType, string>> = {};
    const addressesArr = [];

    for (const asset of enabledAssets) {
      for (const networkType of Object.keys(AssetAddressMap[asset])) {
        addressesArr.push({ [networkType]: null });
        addressPromises.push(this.getAssetAddress(networkType as NetworkType, index));
      }
    }

    const addresses = await Promise.allSettled(addressPromises);
    addressesArr.forEach((obj, i) => {
      const key = Object.keys(obj)[0];
      if (addresses[i].status === 'fulfilled') {
        // @ts-expect-error
        networkAddresses[key] = (addresses[i] as any).value.address;
      } else {
        // @ts-expect-error
        networkAddresses[key] = null;
        console.error(
          `Error while resolving wallet address ${key} - err - ${(addresses[i] as any).reason}`
        );
      }
    });

    networkAddresses[NetworkType.POLYGON] = networkAddresses[NetworkType.ETHEREUM];
    networkAddresses[NetworkType.ARBITRUM] = networkAddresses[NetworkType.ETHEREUM];
    networkAddresses[NetworkType.SPARK] =
      'sp1pgssxqpskk24k3wqw2zz9ax2dg42w3803lus6u87ck4h82wg2za6gkdmxshzyx';

    return networkAddresses;
  }

  private async resolveWalletAddressesAndBalances(
    enabledAssets: AssetTicker[],
    index: number = 0
  ): Promise<{
    addresses: Partial<Record<NetworkType, string>>;
    balances: Record<
      string,
      { balance: number; asset: AssetTicker; fiatValue: number; fiatCurrency: FiatCurrency }
    >;
    transactions: Record<string, Transaction[]>;
  }> {
    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    const addresses = await this.resolveWalletAddresses(enabledAssets, index);

    const promises = [];

    promises.push(this.resolveWalletTransactions(enabledAssets, addresses));
    promises.push(this.resolveWalletBalances(enabledAssets, addresses));

    const [transactions, balances] = await Promise.all(promises);

    return {
      addresses,
      balances: balances as Record<
        string,
        { balance: number; asset: AssetTicker; fiatValue: number; fiatCurrency: FiatCurrency }
      >,
      transactions: transactions as Record<string, Transaction[]>,
    };
  }

  async quoteSendByNetwork(
    network: NetworkType,
    index: number,
    amount: number,
    recipientAddress: string,
    asset: AssetTicker
  ): Promise<number> {
    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    // Check if any wallet exists and the WDK Manager is started with a seed
    const hasWallet = this.walletManagerCache.size > 0;
    if (!hasWallet) {
      throw new Error(
        'No wallet found. Please create or import a wallet first before quoting transactions.'
      );
    }

    if (network === NetworkType.SEGWIT) {
      const quote = await this.wdkManager.quoteSendTransaction({
        network: 'bitcoin',
        accountIndex: index,
        options: {
          to: recipientAddress || 'bc1qraj47d6py592h6rufwkuf8m2xeljdqn34474l3',
          value: new Decimal(amount).mul(this.getDenominationValue(AssetTicker.BTC)).toNumber(),
        },
      });

      return quote.fee / this.getDenominationValue(AssetTicker.BTC);
    } else if (
      [NetworkType.ETHEREUM, NetworkType.POLYGON, NetworkType.ARBITRUM, NetworkType.TON].includes(
        network
      )
    ) {
      console.log('running quoteSendByNetwork', network, index, amount, recipientAddress, asset);

      if (!recipientAddress) {
        if (network === NetworkType.TON) {
          recipientAddress = 'UQD3pGcepS4RffO1iktLhpucHEXWJhG-U_MjtmLgzB0z7rBw';
        } else {
          recipientAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
        }
      }
      const quote = await this.wdkManager.abstractedAccountQuoteTransfer({
        network: network,
        accountIndex: index,
        options: {
          recipient: recipientAddress || '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          // @ts-expect-error
          token: SMART_CONTRACT_BALANCE_ADDRESSES[asset][network],
          amount: 1000,
        },
      });

      return quote.fee / this.getDenominationValue(AssetTicker.USDT);
    } else {
      throw new Error('Unsupported network');
    }
  }

  async sendByNetwork(
    network: NetworkType,
    index: number,
    amount: number,
    recipientAddress: string,
    asset: AssetTicker
  ): Promise<any> {
    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    // Check if any wallet exists and the WDK Manager is started with a seed
    const hasWallet = this.walletManagerCache.size > 0;
    if (!hasWallet) {
      throw new Error(
        'No wallet found. Please create or import a wallet first before sending transactions.'
      );
    }

    if (network === NetworkType.SEGWIT) {
      const sendParams = {
        to: recipientAddress,
        value: new Decimal(amount).mul(this.getDenominationValue(AssetTicker.BTC)).toNumber(),
      };

      const response = await this.wdkManager.sendTransaction({
        network: network,
        accountIndex: index,
        options: sendParams,
      });

      return response;
    } else if (
      [NetworkType.ETHEREUM, NetworkType.POLYGON, NetworkType.ARBITRUM, NetworkType.TON].includes(
        network
      )
    ) {
      const sendParams = {
        recipient: recipientAddress,
        // @ts-expect-error
        token: SMART_CONTRACT_BALANCE_ADDRESSES[asset][network],
        amount: new Decimal(amount).mul(this.getDenominationValue(AssetTicker.USDT)).toNumber(),
      };

      const response = await this.wdkManager.abstractedAccountTransfer({
        network: network,
        accountIndex: index,
        options: sendParams,
      });

      return response;
    } else {
      throw new Error('Unsupported network');
    }
  }

  private getDenominationValue(asset: AssetTicker): number {
    switch (asset) {
      case AssetTicker.BTC:
        return 100000000;
      case AssetTicker.USDT:
        return 1000000;
      case AssetTicker.XAUT:
        return 1000000;
      default:
        return 1000000;
    }
  }

  async createWallet(params: { walletName: string; prf: Buffer | string }): Promise<Wallet> {
    let seed = await this.retrieveSeed(params.prf);

    if (!seed) {
      seed = await this.createSeed(params);
    }

    const walletName = params.walletName;
    const availableAssets = [AssetTicker.BTC, AssetTicker.USDT, AssetTicker.XAUT];

    const wallet: Wallet = {
      id: `wallet_${Date.now()}`,
      name: walletName,
      enabledAssets: availableAssets,
    };

    const wdkManager = BareWorkletApi.hrpcInstances.wdkManager;
    await wdkManager.workletStart({
      enableDebugLogs: 0,
      seedPhrase: seed,
      config: JSON.stringify(config),
    });

    console.info(`Wallet ${wallet.id} created`, wallet);

    // Update our local reference
    this.wdkManager = BareWorkletApi.hrpcInstances.wdkManager;

    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized after wallet creation');
    }

    this.walletManagerCache.set(wallet.id, {
      wdk: this.wdkManager,
      data: wallet,
      account: {},
      transactions: [],
      suggestions: [],
      news: [],
      securityAlerts: [],
      jars: [],
    });

    return wallet;
  }

  async initializeAccountWithBalances(params: InitializeAccountParams): Promise<AccountData> {
    const wallet = this.walletManagerCache.get(params.walletId);

    if (!wallet) {
      throw new Error(`Wallet ${params.walletId} not found`);
    }

    if (!this.wdkManager) {
      throw new Error('WDK Manager not initialized');
    }

    const data = await this.resolveWalletAddressesAndBalances(
      wallet.data.enabledAssets,
      params.accountIndex
    );
    const addresses: Address[] = Object.entries(data.addresses).map(([networkType, address]) => ({
      networkType: networkType as NetworkType,
      value: address || '',
    }));

    const balances: FiatAmount[] = Object.entries(data.balances).map(
      ([key, { balance, asset, fiatValue, fiatCurrency }]) => {
        const [networkType] = key.split('_') as [NetworkType];
        return {
          networkType,
          denomination: asset,
          value: balance.toString(),
          fiatValue: fiatValue.toString(),
          currency: fiatCurrency,
        };
      }
    );

    const transactions: Transaction[] = Object.entries(data.transactions).reduce(
      (allTransactions, [key, txArray]) => {
        return allTransactions.concat(txArray);
      },
      [] as Transaction[]
    );

    const accountData: AccountData = {
      addresses,
      balances,
      transactions,
      addressMap: data.addresses,
      balanceMap: data.balances,
      transactionMap: data.transactions,
    };

    wallet.account[params.accountIndex] = accountData;

    return accountData;
  }

  async resolveWalletTransactions(
    enabledAssets: AssetTicker[],
    networkAddresses: Partial<Record<NetworkType, string>>
  ): Promise<Record<string, Transaction[]>> {
    const transactionPromises = [];
    const transactionMap: Record<string, any[]> = {};

    for (const asset of enabledAssets) {
      const networks = AssetBalanceMap[asset];
      if (!networks) continue;

      for (const [networkType] of Object.entries(networks)) {
        const key = `${networkType}_${asset}`;
        transactionMap[key] = [];
        transactionPromises.push(
          (async () => {
            try {
              const address = networkAddresses[networkType as NetworkType];
              if (!address) {
                console.error(`Address not found for network ${networkType} asset ${asset}`);
                return;
              }

              const response = await fetch(
                `https://wdk-api-staging.tether.su/api/v1/${networkType}/${asset}/${address}/token-transfers?limit=100`,
                {
                  method: 'GET',
                  headers: {
                    'X-API-KEY': process.env.EXPO_PUBLIC_WDK_KEY!,
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch transactions: ${response.status}`);
              }

              const data = await response.json();

              // Add fiat values to transactions
              const transactionsWithFiat = await Promise.all(
                (data.transfers || []).map(async (tx: Transaction) => {
                  const amount = parseFloat(tx.amount);
                  const fiatAmount = await this.getFiatValue(amount, asset, FiatCurrency.USD);
                  return {
                    ...tx,
                    fiatAmount: fiatAmount,
                    fiatCurrency: FiatCurrency.USD,
                  };
                })
              );

              transactionMap[key] = transactionsWithFiat;
            } catch (error: any) {
              console.log(
                `Error getting ${asset} transactions from ${networkType}:`,
                error.message
              );
              transactionMap[key] = [];
            }
          })()
        );
      }
    }

    await Promise.all(transactionPromises);
    return transactionMap;
  }

  async resolveWalletBalances(
    enabledAssets: AssetTicker[],
    networkAddresses: Partial<Record<NetworkType, string>>
  ): Promise<
    Record<
      string,
      { balance: number; asset: AssetTicker; fiatValue: number; fiatCurrency: FiatCurrency }
    >
  > {
    const balancePromises = [];
    const balanceMap: Record<
      string,
      { balance: number; asset: AssetTicker; fiatValue: number; fiatCurrency: FiatCurrency }
    > = {};

    for (const asset of enabledAssets) {
      const networks = AssetBalanceMap[asset];
      if (!networks) continue;

      for (const [networkType] of Object.entries(networks)) {
        const key = `${networkType}_${asset}`;
        balanceMap[key] = { balance: 0, asset, fiatValue: 0, fiatCurrency: FiatCurrency.USD };
        balancePromises.push(
          (async () => {
            try {
              const address = networkAddresses[networkType as NetworkType];
              if (!address) {
                console.error(`Address not found for network ${networkType} asset ${asset}`);
                return;
              }

              const response = await fetch(
                `https://wdk-api-staging.tether.su/api/v1/${networkType}/${asset}/${address}/token-balances`,
                {
                  method: 'GET',
                  headers: {
                    'X-API-KEY': process.env.EXPO_PUBLIC_WDK_KEY!,
                  },
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to fetch balance: ${response.status}`);
              }

              const data = await response.json();

              // Extract USDT balance
              const balance = parseFloat(data.tokenBalance.amount) || 0;
              const fiatValue = await wdkService.getFiatValue(balance, asset, FiatCurrency.USD);

              balanceMap[key].balance = Number(balance);
              balanceMap[key].fiatValue = fiatValue;
              balanceMap[key].fiatCurrency = FiatCurrency.USD;
            } catch (error: any) {
              console.log(`Error getting ${asset} balance from ${networkType}:`, error.message);
              balanceMap[key].balance = 0;
            }
          })()
        );
      }
    }

    await Promise.all(balancePromises);
    return balanceMap;
  }

  async getWallets(): Promise<Wallet[]> {
    return Array.from(this.walletManagerCache.values()).map(cache => cache.data);
  }

  async getFiatValue(value: number, asset: AssetTicker, currency: FiatCurrency): Promise<number> {
    return new Decimal(value).mul(this.fiatExchangeRateCache[currency][asset]).toNumber();
  }

  async refreshWalletBalance(params: { walletId: string }): Promise<{ success: boolean }> {
    const wallet = this.walletManagerCache.get(params.walletId);

    if (!wallet) {
      throw new Error(`Wallet ${params.walletId} not found`);
    }

    // TODO: Implement proper balance refresh using existing methods
    return { success: true };
  }

  hasWallet(): boolean {
    return this.walletManagerCache.size > 0;
  }
}

export const wdkService = WDKService.getInstance();

export { wdkService as WDKService };
