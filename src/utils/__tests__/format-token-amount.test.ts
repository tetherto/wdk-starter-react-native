import formatTokenAmount from '../format-token-amount';
import { bn } from '@/utils/bignumber';

jest.mock('@/config/assets', () => ({
  assetConfig: {
    btc: { symbol: 'BTC' },
    usdt: { symbol: 'USD₮' },
    xaut: { symbol: 'XAU₮' },
  },
}));

import { AssetTicker } from '@tetherto/wdk-react-native-provider';

jest.mock('@tetherto/wdk-react-native-provider', () => ({
  AssetTicker: {
    USDT: 'USDT',
    BTC: 'BTC',
    XAUT: 'XAUT',
  },
}));

describe('formatTokenAmount (integration style)', () => {
  const token = AssetTicker.USDT;

  test('returns "0.00 SYMBOL" for zero amount', () => {
    const result = formatTokenAmount(bn(0), token);
    expect(result).toBe('0.00 USD₮');
  });

  test('does not append symbol when includeSymbol = false', () => {
    const result = formatTokenAmount(bn(0), token, false);
    expect(result).toBe('0.00');
  });

  test('formats small non-zero amount correctly', () => {
    const amount = bn(0.00123);
    const result = formatTokenAmount(amount, token);
    expect(result.endsWith('USD₮')).toBe(true);
    expect(result).not.toBe('0.00 USD₮');
  });
});
