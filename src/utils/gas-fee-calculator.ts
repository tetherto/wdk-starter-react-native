import { AssetTicker, NetworkType, WDKService } from '@tetherto/wdk-react-native-provider';
import { bn, lte, type BNValue } from '@/utils/bignumber';

export interface GasFeeEstimate {
  fee?: BigNumber;
  error?: string;
}

const QUOTE_RECIPIENTS = {
  [AssetTicker.BTC]: {
    networks: {
      [NetworkType.SEGWIT]: 'bc1qh96eg54ddu4q2cmn0n6g8uymuqlw402jndphu9',
    },
  },
  [AssetTicker.USDT]: {
    networks: {
      [NetworkType.ETHEREUM]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.POLYGON]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.ARBITRUM]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.TON]: 'EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb',
      [NetworkType.TRON]: 'TLDCVJBtvYXJb2fEEk5pPoApHZbyuf2TyG',
      [NetworkType.SOLANA]: '74xb5G9LTr1J45HPcLqz6VF4NHVQtRqrTDD1MQ8D7zer',
    },
  },
  [AssetTicker.XAUT]: {
    networks: {
      [NetworkType.ETHEREUM]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.POLYGON]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.ARBITRUM]: '0x8d42eb95360bf68d65e5a810986b2ebd88c5e606',
      [NetworkType.TON]: 'EQD5mxRgCuRNLxKxeOjG6r14iSroLF5FtomPnet-sgP5xNJb',
    },
  },
};

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
export const calculateGasFee = async (
  networkId: string,
  tokenId: string,
  amount?: BNValue
): Promise<GasFeeEstimate> => {
  try {
    const networkType = getNetworkType(networkId);
    const assetTicker = getAssetTicker(tokenId);
    // @ts-expect-error
    const quoteRecipient = QUOTE_RECIPIENTS[assetTicker].networks[networkType];
    const amountBn = amount === undefined ? undefined : bn(amount);

    if (!amount && networkType === NetworkType.SEGWIT) {
      return {
        fee: undefined,
        error: 'Insufficient balance for fee calculation',
      };
    }

    const quoteAmountBn =
      assetTicker === AssetTicker.BTC
        ? bn(amountBn!).decimalPlaces(8, BigNumber.ROUND_DOWN)
        : bn(1);
    const quoteAmountForSdk = quoteAmountBn.toNumber();

    const gasFee = await WDKService.quoteSendByNetwork(
      networkType,
      0, // account index
      quoteAmountForSdk,
      quoteRecipient,
      assetTicker
    );

    return { fee: bn(gasFee as any) };
  } catch (error) {
    console.error('Gas fee pre-calculation failed:', error);
    const networkType = getNetworkType(networkId);
    const isBitcoinNetwork =
      networkType === NetworkType.SEGWIT || networkType === NetworkType.LIGHTNING;

    if (
      isBitcoinNetwork &&
      error instanceof Error &&
      error.message.includes('Insufficient balance')
    ) {
      return {
        fee: undefined,
        error: 'Insufficient balance for fee calculation',
      };
    } else if (
      isBitcoinNetwork &&
      error instanceof Error &&
      error.message.includes('amount must be bigger than the dust limit')
    ) {
      return {
        fee: undefined,
        error: `The amount must be bigger than the dust limit`,
      };
    } else {
      return {
        fee: undefined,
        error: error instanceof Error ? error.message : 'Failed to calculate fee',
      };
    }
  }
};
