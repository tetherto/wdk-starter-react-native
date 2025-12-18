import BigNumber from 'bignumber.js';
import { pricingService, FiatCurrency } from '../pricing-service';

// Define local enum for type safety in tests
export enum AssetTicker {
  BTC = 'btc',
  USDT = 'usdt',
  XAUT = 'xaut',
}

// ------------------- Mock external modules -------------------

// Mock for ESM package @tetherto/wdk-react-native-provider
jest.mock('@tetherto/wdk-react-native-provider', () => ({
  AssetTicker: {
    BTC: 'btc',
    USDT: 'usdt',
    XAUT: 'xaut',
  },
  useWallet: jest.fn(() => ({
    wallet: { id: 'test-wallet' },
    balances: { list: [], isLoading: false },
  })),
}));

// Mock for BitfinexPricingClient
jest.mock('@tetherto/wdk-pricing-bitfinex-http', () => ({
  BitfinexPricingClient: jest.fn().mockImplementation(() => ({})),
}));

// Mock for PricingProvider
jest.mock('@tetherto/wdk-pricing-provider', () => ({
  PricingProvider: jest.fn().mockImplementation(() => ({
    getLastPrice: jest.fn((asset: string) => {
      switch (asset) {
        case 'btc':
          return Promise.resolve(60000);
        case 'usdt':
          return Promise.resolve(1);
        case 'xaut':
          return Promise.resolve(2000);
        default:
          return Promise.resolve(0);
      }
    }),
  })),
}));

// ------------------- Test suite -------------------

describe('PricingService', () => {
  const service = pricingService;

  beforeEach(async () => {
    // Reset service state before each test
    (service as any).provider = null;
    (service as any).fiatExchangeRateCache = undefined;
    (service as any).isInitialized = false;

    // Initialize service
    await service.initialize();
  });

  it('should initialize and populate exchange rates', () => {
    expect(service.isReady()).toBe(true);
    expect(service.getExchangeRate(AssetTicker.BTC, FiatCurrency.USD)).toBe(60000);
    expect(service.getExchangeRate(AssetTicker.USDT, FiatCurrency.USD)).toBe(1);
    expect(service.getExchangeRate(AssetTicker.XAUT, FiatCurrency.USD)).toBe(2000);
  });

  it('getFiatValue should return correct number', async () => {
    const result = await service.getFiatValue(0.5, AssetTicker.BTC, FiatCurrency.USD);
    expect(result.toNumber()).toBe(30000);
  });

  it('getFiatValue should return correct BN', async () => {
    const valueBN = await service.getFiatValue(0.5, AssetTicker.BTC, FiatCurrency.USD);
    expect(valueBN).toBeInstanceOf(BigNumber);
    expect(valueBN.toString()).toBe(new BigNumber(0.5).multipliedBy(60000).toString());
  });

  it('getFiatValue should work with BN input', async () => {
    const inputBN = new BigNumber(0.25);
    const valueBN = await service.getFiatValue(inputBN, AssetTicker.BTC, FiatCurrency.USD);
    expect(valueBN.toString()).toBe(new BigNumber(0.25).multipliedBy(60000).toString());
  });

  it('should throw error if service not initialized', async () => {
    (service as any).isInitialized = false;

    await expect(service.getFiatValue(1, AssetTicker.BTC, FiatCurrency.USD)).rejects.toThrow(
      'Pricing service not initialized. Call initialize() first.'
    );

    await expect(service.getFiatValue(1, AssetTicker.BTC, FiatCurrency.USD)).rejects.toThrow(
      'Pricing service not initialized. Call initialize() first.'
    );
  });

  it('getFiatValue should throw if exchange rate missing', async () => {
    await expect(service.getFiatValue(1, 'fake' as any, FiatCurrency.USD)).rejects.toThrow(
      'No exchange rate for fake -> USD'
    );
  });
});
