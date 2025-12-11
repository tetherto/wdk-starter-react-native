import formatAmount from '../format-amount';

describe('formatAmount', () => {
  test('formats a number with default 2 fraction digits', () => {
    expect(formatAmount(1234.5)).toBe('1,234.50');
  });

  test('formats a number with a custom minimumFractionDigits', () => {
    expect(
      formatAmount(10, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    ).toBe('10.0000');
  });

  test('formats a number with a custom maximumFractionDigits', () => {
    expect(formatAmount(3.14159, { maximumFractionDigits: 3 })).toBe('3.142');
  });

  test('formats a number with both custom minimum and maximum fraction digits', () => {
    expect(
      formatAmount(99.1, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 4,
      })
    ).toBe('99.1');
  });

  test('formats an integer value', () => {
    expect(formatAmount(5000)).toBe('5,000.00');
  });

  test('formats zero correctly', () => {
    expect(formatAmount(0)).toBe('0.00');
  });

  test('formats negative values', () => {
    expect(formatAmount(-1200.5)).toBe('-1,200.50');
  });
});
