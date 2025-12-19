import BigNumber from 'bignumber.js';

BigNumber.config({
  DECIMAL_PLACES: 20,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
});

// Type representing values that can be converted to BN
export type BNValue = string | number | BigNumber;

/**
 * Factory function to create a BN instance safely
 * - Accepts string, number, or BN instance
 * - Avoids precision loss from floating point numbers
 */
export function bn(value: BNValue): BigNumber {
  if (BigNumber.isBigNumber(value)) return value;

  if (typeof value === 'number') {
    return new BigNumber(value.toString());
  }
  const res = new BigNumber(value);
  if (res.isNaN()) {
    console.warn('Incorrect value, received', value);
    return new BigNumber(0);
  }
  return res;
}

// ------------------- Arithmetic operations -------------------
export const add = (a: BNValue, b: BNValue): BigNumber => bn(a).plus(b);
export const sub = (a: BNValue, b: BNValue): BigNumber => bn(a).minus(b);
export const mul = (a: BNValue, b: BNValue): BigNumber => bn(a).multipliedBy(b);
export const div = (a: BNValue, b: BNValue): BigNumber => bn(a).dividedBy(b);

// ------------------- Comparison operations -------------------
export const eq = (a: BNValue, b: BNValue): boolean => bn(a).isEqualTo(b);
export const gt = (a: BNValue, b: BNValue): boolean => bn(a).isGreaterThan(b);
export const gte = (a: BNValue, b: BNValue): boolean => bn(a).isGreaterThanOrEqualTo(b);
export const lt = (a: BNValue, b: BNValue): boolean => bn(a).isLessThan(b);
export const lte = (a: BNValue, b: BNValue): boolean => bn(a).isLessThanOrEqualTo(b);
