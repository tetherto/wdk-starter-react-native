import { AssetTicker } from '@tetherto/wdk-react-native-provider';
import formatAmount from './format-amount';
import getDisplaySymbol from './get-display-symbol';
import BigNumber from 'bignumber.js';

const formatTokenAmount = (
  amount: BigNumber,
  token: AssetTicker,
  includeSymbol: boolean = true
) => {
  const suffix = includeSymbol ? ` ${getDisplaySymbol(token)}` : '';

  if (amount.isZero()) return `0.00${suffix}`;

  const decimals = Math.max(Math.ceil(Math.abs(Math.log10(amount.toNumber()))), 2);

  return formatAmount(amount, decimals, BigNumber.ROUND_HALF_UP, {
    suffix,
  });
};

export default formatTokenAmount;
