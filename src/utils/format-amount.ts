import BigNumber from 'bignumber.js';

const formatAmount = (
  amount: number,
  {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  }: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
) =>
  amount.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

export default formatAmount;

export const formatAmountBN = (
  amount: BigNumber,
  decimalPlaces: number = 2,
  roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_HALF_UP,
  format?: BigNumber.Format
): string => {
  return amount.toFormat(decimalPlaces, roundingMode, format);
};
