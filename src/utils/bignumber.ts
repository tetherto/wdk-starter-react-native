import BN from 'bignumber.js';

// Configure global BigNumber settings
// DECIMAL_PLACES: maximum number of decimal places to use in calculations
// ROUNDING_MODE: rounding mode (ROUND_DOWN to avoid overestimating amounts)
BN.config({
  DECIMAL_PLACES: 20,
  ROUNDING_MODE: BN.ROUND_DOWN,
});

// Type representing values that can be converted to BN
export type BNValue = string | number | BN;

/**
 * Factory function to create a BN instance safely
 * - Accepts string, number, or BN instance
 * - Avoids precision loss from floating point numbers
 */
export function bn(value: BNValue): BN {
  if (value instanceof BN) return value; // already a BN instance
  if (typeof value === 'number') {
    // convert number to string to prevent floating-point precision issues
    return new BN(value.toString());
  }
  return new BN(value); // assume string input
}

// ------------------- Arithmetic operations -------------------

/** Add two BN values */
export const add = (a: BNValue, b: BNValue): BN => bn(a).plus(b);

/** Subtract b from a */
export const sub = (a: BNValue, b: BNValue): BN => bn(a).minus(b);

/** Multiply two BN values */
export const mul = (a: BNValue, b: BNValue): BN => bn(a).multipliedBy(b);

/** Divide a by b */
export const div = (a: BNValue, b: BNValue): BN => bn(a).dividedBy(b);

// ------------------- Comparison operations -------------------

/** Check if two BN values are equal */
export const eq = (a: BNValue, b: BNValue): boolean => bn(a).isEqualTo(b);

/** Check if a > b */
export const gt = (a: BNValue, b: BNValue): boolean => bn(a).isGreaterThan(b);

/** Check if a >= b */
export const gte = (a: BNValue, b: BNValue): boolean => bn(a).isGreaterThanOrEqualTo(b);

/** Check if a < b */
export const lt = (a: BNValue, b: BNValue): boolean => bn(a).isLessThan(b);

/** Check if a <= b */
export const lte = (a: BNValue, b: BNValue): boolean => bn(a).isLessThanOrEqualTo(b);
