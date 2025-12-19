import BigNumber from 'bignumber.js';
import { bn, add, sub, mul, div, eq, gt, gte, lt, lte, BNValue } from '../bignumber';

describe('BN utility functions', () => {
  // ------------------- bn() factory -------------------
  describe('bn()', () => {
    it('should return the same BigNumber instance if input is already BN', () => {
      const value = new BigNumber('123.45');
      expect(bn(value)).toBe(value);
    });

    it('should convert number to BN without precision loss', () => {
      const value: number = 0.1 + 0.2;
      const result = bn(value);
      expect(result.toString()).toBe('0.30000000000000004');
    });

    it('should convert string to BN', () => {
      const value = '123.456';
      const result = bn(value);
      expect(result.toString()).toBe('123.456');
    });

    it('should return 0 and warn if input is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = bn('invalid' as any);
      expect(result.toString()).toBe('0');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ------------------- Arithmetic -------------------
  describe('arithmetic operations', () => {
    const a: BNValue = '10.5';
    const b: BNValue = 2;

    it('add()', () => {
      expect(add(a, b).toString()).toBe('12.5');
    });

    it('sub()', () => {
      expect(sub(a, b).toString()).toBe('8.5');
    });

    it('mul()', () => {
      expect(mul(a, b).toString()).toBe('21');
    });

    it('div()', () => {
      expect(div(a, b).toString()).toBe('5.25');
    });

    it('div() by zero returns Infinity', () => {
      expect(div(a, 0).isFinite()).toBe(false);
    });
  });

  // ------------------- Comparison -------------------
  describe('comparison operations', () => {
    const a: BNValue = '5.5';
    const b: BNValue = 5.5;
    const c: BNValue = '6';

    it('eq()', () => {
      expect(eq(a, b)).toBe(true);
      expect(eq(a, c)).toBe(false);
    });

    it('gt()', () => {
      expect(gt(c, a)).toBe(true);
      expect(gt(a, c)).toBe(false);
    });

    it('gte()', () => {
      expect(gte(a, b)).toBe(true);
      expect(gte(a, c)).toBe(false);
    });

    it('lt()', () => {
      expect(lt(a, c)).toBe(true);
      expect(lt(c, a)).toBe(false);
    });

    it('lte()', () => {
      expect(lte(a, b)).toBe(true);
      expect(lte(c, a)).toBe(false);
    });
  });

  // ------------------- Large / small numbers -------------------
  describe('edge cases with large and small numbers', () => {
    it('should handle very small decimals', () => {
      const small = bn('0.0000000000000001234');
      expect(small.toString()).toBe('1.234e-16');
    });

    it('should handle very large numbers', () => {
      const large = bn('123456789012345678901234567890');
      expect(large.toFixed()).toBe('123456789012345678901234567890');
    });
  });
});
