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
