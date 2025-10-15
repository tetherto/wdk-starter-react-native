import formatAmount from './format-amount';

const formatUSDValue = (usdValue: number, includeSymbol: boolean = true): string => {
  if (usdValue === 0) return `0.00${includeSymbol ? ' USD' : ''}`;
  if (usdValue < 0.01) return `< 0.01${includeSymbol ? ' USD' : ''}`;
  return `${formatAmount(usdValue)}${includeSymbol ? ' USD' : ''}`;
};

export default formatUSDValue;
