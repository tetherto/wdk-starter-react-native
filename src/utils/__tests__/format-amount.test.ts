import BigNumber from 'bignumber.js';
import formatAmount from '../format-amount';
import { bn } from '@/utils';

describe('formatAmount', () => {
  test('formats a number with default 2 decimal places', () => {
    expect(formatAmount(bn(1234.5))).toBe('1,234.50');
  });

  test('formats a number with custom decimal places', () => {
    expect(formatAmount(bn(10), 4)).toBe('10.0000');
  });

  test('rounds a number using default ROUND_HALF_UP', () => {
    expect(formatAmount(bn(3.14159), 3)).toBe('3.142');
  });

  test('formats a number with fewer decimals without trailing zeros when decimalPlaces is smaller', () => {
    expect(formatAmount(bn(99.1), 1)).toBe('99.1');
  });

  test('formats an integer value', () => {
    expect(formatAmount(bn(5000))).toBe('5,000.00');
  });

  test('formats zero correctly', () => {
    expect(formatAmount(bn(0))).toBe('0.00');
  });

  test('formats negative values', () => {
    expect(formatAmount(bn(-1200.5))).toBe('-1,200.50');
  });

  test('supports custom rounding mode', () => {
    expect(
      formatAmount(
        bn(1.005),
        2,
        BigNumber.ROUND_DOWN
      )
    ).toBe('1.00');
  });

  test('supports custom format options', () => {
    const format: BigNumber.Format = {
      decimalSeparator: ',',
      groupSeparator: ' ',
      groupSize: 3,
    };

    expect(formatAmount(bn(1234.56), 2, BigNumber.ROUND_HALF_UP, format)).toBe(
      '1 234,56'
    );
  });
});
