import formatAmount from './format-amount';
import BigNumber from 'bignumber.js';

const formatUSDValue = (usdValue: BigNumber, includeSymbol: boolean = true): string => {
  const suffix = includeSymbol ? ' USD' : '';

  if (usdValue.isZero()) {
    return `0.00${suffix}`;
  }

  if (usdValue.lt(0.01)) {
    return `< 0.01${suffix}`;
  }

  return formatAmount(usdValue, 2, BigNumber.ROUND_HALF_UP, {
    suffix,
  });
};

export default formatUSDValue;
