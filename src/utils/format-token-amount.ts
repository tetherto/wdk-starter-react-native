import { AssetTicker } from '@tetherto/wdk-react-native-provider';
import formatAmount, { formatAmountBN } from './format-amount';
import getDisplaySymbol from './get-display-symbol';
import BigNumber from 'bignumber.js';

const formatTokenAmount = (amount: number, token: AssetTicker, includeSymbol: boolean = true) => {
  const symbol = getDisplaySymbol(token);

  if (amount === 0) return `0.00${includeSymbol ? ` ${symbol}` : ''}`;

  let decimals = Math.max(Math.ceil(Math.abs(Math.log10(amount))), 2);

  const formattedAmount = formatAmount(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formattedAmount}${includeSymbol ? ` ${symbol}` : ''}`;
};

export default formatTokenAmount;


export const formatTokenAmountBN = (
  amount: BigNumber,
  token: AssetTicker,
  includeSymbol: boolean = true
) => {
  const symbol = getDisplaySymbol(token);

  if (amount.isZero()) return `0.00${includeSymbol ? ` ${symbol}` : ''}`;

  const decimals = Math.max(Math.ceil(Math.abs(Math.log10(amount.toNumber()))), 2);

  const formattedAmount = formatAmountBN(amount, decimals);

  return `${formattedAmount}${includeSymbol ? ` ${symbol}` : ''}`;
};

