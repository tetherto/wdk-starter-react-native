import formatAmount, { formatAmountBN } from './format-amount';
import BigNumber from 'bignumber.js';

const formatUSDValue = (usdValue: number, includeSymbol: boolean = true): string => {
  if (usdValue === 0) return `0.00${includeSymbol ? ' USD' : ''}`;
  if (usdValue < 0.01) return `< 0.01${includeSymbol ? ' USD' : ''}`;
  return `${formatAmount(usdValue)}${includeSymbol ? ' USD' : ''}`;
};

export default formatUSDValue;

export const formatUSDValueBN = (usdValue: BigNumber, includeSymbol: boolean = true): string => {
  const symbol = includeSymbol ? ' USD' : '';

  if (usdValue.isZero()) {
    return `0.00${symbol}`;
  }

  // < 0.01 → render as "< 0.01 USD"
  if (usdValue.lt(0.01)) {
    return `< 0.01${symbol}`;
  }

  // Default formatting: 2 decimal places
  return `${formatAmountBN(usdValue, 2)}${symbol}`;
};
