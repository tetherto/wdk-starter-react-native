import { NetworkId } from '@/config/chain';

export interface GasFeeEstimate {
  fee?: number;
  error?: string;
}

export const calculateGasFee = async (
  networkId: NetworkId,
  _tokenId: string,
  _amount?: number
): Promise<GasFeeEstimate> => {
  const defaultFees: Partial<Record<NetworkId, number>> = {
    [NetworkId.ETHEREUM]: 0.001,
    [NetworkId.POLYGON]: 0.0001,
    [NetworkId.ARBITRUM]: 0.0001,
    [NetworkId.SPARK]: 0.00001,
    [NetworkId.SPARK_REGTEST]: 0.00001,
    [NetworkId.PLASMA]: 0.0001,
    [NetworkId.SEPOLIA]: 0.001,
  };

  return {
    fee: defaultFees[networkId] || 0.001,
  };
};
