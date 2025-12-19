import BigNumber from 'bignumber.js';

const formatAmount = (
  amount: BigNumber,
  decimalPlaces: number = 2,
  roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_HALF_UP,
  format?: BigNumber.Format
): string => {
  return amount.toFormat(decimalPlaces, roundingMode, format);
};

export default formatAmount;
