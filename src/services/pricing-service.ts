import { BitfinexPricingClient } from '@tetherto/wdk-pricing-bitfinex-http';
import { PricingProvider } from '@tetherto/wdk-pricing-provider';
import DecimalJS from 'decimal.js';
import { getAssetTicker, TOKEN_UI_CONFIGS } from '@/config/token';

export enum FiatCurrency {
  USD = 'USD',
}

class PricingService {
  private static instance: PricingService;
  private provider: PricingProvider | null = null;
  private fiatExchangeRateCache: Record<FiatCurrency, Record<string, number>> | undefined;
  private isInitialized: boolean = false;

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

      await this.refreshExchangeRates();
    } catch (error) {
      console.error('Failed to initialize pricing service:', error);
      throw error;
    }
  }

  async getFiatValue(value: number, asset: string, currency: FiatCurrency): Promise<number> {
    if (!this.isInitialized || !this.fiatExchangeRateCache) {
      throw new Error('Pricing service not initialized. Call initialize() first.');
    }

    const rate = this.fiatExchangeRateCache[currency][asset];
    if (rate === undefined) {
      return 0;
    }

    return new DecimalJS(value).mul(rate).toNumber();
  }

  async refreshExchangeRates(): Promise<void> {
    if (!this.provider) {
      throw new Error('Pricing service not initialized');
    }

    try {
      const rates: Record<string, number> = {};
      const tokens = Object.values(TOKEN_UI_CONFIGS);

      await Promise.all(
        tokens.map(async (tokenConfig) => {
          if (tokenConfig.id === 'usdt') {
            rates[tokenConfig.id] = 1;
          } else {
            const ticker = getAssetTicker(tokenConfig);
            rates[tokenConfig.id] = await this.provider!.getLastPrice(ticker, FiatCurrency.USD);
          }
        })
      );

      this.fiatExchangeRateCache = {
        [FiatCurrency.USD]: rates,
      };

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to refresh exchange rates:', error);
      throw error;
    }
  }

  getExchangeRate(asset: string, currency: FiatCurrency): number | undefined {
    return this.fiatExchangeRateCache?.[currency]?.[asset];
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export const pricingService = PricingService.getInstance();
