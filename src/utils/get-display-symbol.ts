import { TOKEN_UI_CONFIGS } from '@/config/token';

const getDisplaySymbol = (tokenSymbol: string) => {
  const lower = tokenSymbol.toLowerCase();

  const config = TOKEN_UI_CONFIGS[lower];
  if (config) return config.symbol;

  return lower.toUpperCase();
};

export default getDisplaySymbol;
