import { assetConfig } from '@/config/assets';

const getDisplaySymbol = (denomination: string) => {
  const lower = denomination.toLowerCase();

  const config = assetConfig[lower];
  if (config) return config.symbol;

  return lower.toUpperCase();
};

export default getDisplaySymbol;
