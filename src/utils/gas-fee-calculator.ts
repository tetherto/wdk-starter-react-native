import {
  AssetTicker,
  NetworkType,
  SMART_CONTRACT_BALANCE_ADDRESSES,
  WDKService,
} from '@tetherto/wdk-react-native-provider';

export interface GasFeeEstimate {
  fee?: number;
  loading: boolean;
  error?: string;
}

// Network type mapping
export const getNetworkType = (networkId: string): NetworkType => {
  const networkMap: Record<string, NetworkType> = {
    ethereum: NetworkType.ETHEREUM,
    polygon: NetworkType.POLYGON,
    arbitrum: NetworkType.ARBITRUM,
    bitcoin: NetworkType.SEGWIT,
    lightning: NetworkType.LIGHTNING,
    ton: NetworkType.TON,
    tron: NetworkType.TRON,
    solana: NetworkType.SOLANA,
  };
  return networkMap[networkId] || NetworkType.ETHEREUM;
};

// Asset ticker mapping
export const getAssetTicker = (tokenId: string): AssetTicker => {
  const assetMap: Record<string, AssetTicker> = {
    btc: AssetTicker.BTC,
    usdt: AssetTicker.USDT,
    xaut: AssetTicker.XAUT,
  };
  return assetMap[tokenId?.toLowerCase()] || AssetTicker.USDT;
};


/**
 * Pre-calculates gas fee using dummy values
 * This is useful for showing an estimated fee before the user enters transaction details
 */
export const preCalculateGasFee = async (
  networkId: string,
  tokenId: string
): Promise<GasFeeEstimate> => {
  try {
    const networkType = getNetworkType(networkId);
    const assetTicker = getAssetTicker(tokenId);
    // @ts-expect-error
    const dummyRecipient = SMART_CONTRACT_BALANCE_ADDRESSES[assetTicker][networkType];

    console.log('\n\n\n\n dummyRecipient', dummyRecipient, '\n\n\n\n');
    

    // Bitcoin requires a smaller dummy amount due to UTXO requirements
    // Use 0.00001 BTC (1000 satoshis) which is above the dust limit
    const dummyAmount =
      networkType === NetworkType.SEGWIT || networkType === NetworkType.LIGHTNING
        ? 0.00001
        : 1;

    const gasFee = await WDKService.quoteSendByNetwork(
      networkType,
      0, // account index
      dummyAmount,
      dummyRecipient,
      assetTicker
    );

    return { fee: gasFee, loading: false };
  } catch (error) {
    console.error('Gas fee pre-calculation failed:', error);
    const networkType = getNetworkType(networkId);
    const isBitcoinNetwork =
      networkType === NetworkType.SEGWIT || networkType === NetworkType.LIGHTNING;
    const assetTicker = getAssetTicker(tokenId);

    // For Bitcoin, insufficient balance during pre-calculation is expected if wallet has no BTC
    if (
      isBitcoinNetwork &&
      error instanceof Error &&
      error.message.includes('Insufficient balance')
    ) {
      return {
        fee: undefined,
        loading: false,
        error: 'Enter amount to see fee estimate',
      };
    } else if (
      error instanceof Error &&
      error.message.includes('callData reverts') &&
      assetTicker === AssetTicker.XAUT
    ) {
      // XAUT is not supported by the current paymaster configuration
      return {
        fee: undefined,
        loading: false,
        error: 'Gas estimation not available for XAUT',
      };
    } else {
      return {
        fee: undefined,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate fee',
      };
    }
  }
};

/**
 * Calculates gas fee for a specific amount
 * This is useful for Bitcoin networks where fees depend on the transaction amount
 */
export const calculateFeeForAmount = async (
  amount: string,
  networkId: string,
  tokenId: string
): Promise<GasFeeEstimate> => {
  if (!amount || parseFloat(amount) <= 0) {
    return { loading: false };
  }

  const networkType = getNetworkType(networkId);
  const isBitcoinNetwork =
    networkType === NetworkType.SEGWIT || networkType === NetworkType.LIGHTNING;

  // Only recalculate for Bitcoin networks when amount is entered
  if (!isBitcoinNetwork) {
    return { loading: false };
  }

  try {
    const assetTicker = getAssetTicker(tokenId);
    const dummyRecipient = 'bc1qraj47d6py592h6rufwkuf8m2xeljdqn34474l3';
    const numericAmount = parseFloat(amount);

    const gasFee = await WDKService.quoteSendByNetwork(
      networkType,
      0,
      numericAmount,
      dummyRecipient,
      assetTicker
    );

    return { fee: gasFee, loading: false };
  } catch (error) {
    console.error('Failed to calculate fee for entered amount:', error);
    return {
      fee: undefined,
      loading: false,
      error:
        error instanceof Error && error.message.includes('Insufficient balance')
          ? 'Insufficient balance'
          : 'Failed to calculate fee',
    };
  }
};
