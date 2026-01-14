import formatAmount from './format-amount';
import getDisplaySymbol from './get-display-symbol';

const formatTokenAmount = (amount: number, tokenSymbol: string, includeSymbol: boolean = true) => {
  const symbol = getDisplaySymbol(tokenSymbol);

  if (amount === 0) return `0.00${includeSymbol ? ` ${symbol}` : ''}`;

  let decimals = Math.max(Math.ceil(Math.abs(Math.log10(amount))), 2);

  const formattedAmount = formatAmount(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formattedAmount}${includeSymbol ? ` ${symbol}` : ''}`;
};

export default formatTokenAmount;
