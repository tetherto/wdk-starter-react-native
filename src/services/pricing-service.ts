import { BitfinexPricingClient } from '@tetherto/wdk-pricing-bitfinex-http';
import { PricingProvider } from '@tetherto/wdk-pricing-provider';
import { AssetTicker } from '@tetherto/wdk-react-native-provider';
import Decimal from 'decimal.js';

export enum FiatCurrency {
  USD = 'USD',
}

class PricingService {
  private static instance: PricingService;
  private provider: PricingProvider | null = null;
  private fiatExchangeRateCache: Record<FiatCurrency, Record<AssetTicker, number>> | undefined;

  private constructor() {}

  static getInstance(): PricingService {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.provider) return;

    try {
      const client = new BitfinexPricingClient();

      this.provider = new PricingProvider({
        client,
        priceCacheDurationMs: 1000 * 60 * 60, // 1 hour
      });

      // Initialize exchange rate cache
      this.fiatExchangeRateCache = {
        [FiatCurrency.USD]: {
          [AssetTicker.BTC]: await this.provider.getLastPrice(AssetTicker.BTC, FiatCurrency.USD),
          [AssetTicker.USDT]: 1,
          [AssetTicker.XAUT]: await this.provider.getLastPrice(AssetTicker.XAUT, FiatCurrency.USD),
        },
      };
    } catch (error) {
      console.error('Failed to initialize pricing service:', error);
      throw error;
    }
  }

  async getFiatValue(value: number, asset: AssetTicker, currency: FiatCurrency): Promise<number> {
    if (!this.fiatExchangeRateCache) {
      throw new Error(`Fiat exchange rate not ready`);
    }

    return new Decimal(value).mul(this.fiatExchangeRateCache[currency][asset]).toNumber();
  }

  async refreshExchangeRates(): Promise<void> {
    if (!this.provider) {
      throw new Error('Pricing service not initialized');
    }

    try {
      this.fiatExchangeRateCache = {
        [FiatCurrency.USD]: {
          [AssetTicker.BTC]: await this.provider.getLastPrice(AssetTicker.BTC, FiatCurrency.USD),
          [AssetTicker.USDT]: 1,
          [AssetTicker.XAUT]: await this.provider.getLastPrice(AssetTicker.XAUT, FiatCurrency.USD),
        },
      };
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
      throw error;
    }
  }

  getExchangeRate(asset: AssetTicker, currency: FiatCurrency): number | undefined {
    return this.fiatExchangeRateCache?.[currency]?.[asset];
  }
}

export const pricingService = PricingService.getInstance();
