import { useQuery } from '@tanstack/react-query';
import { CoingeckoPricingClient } from '@tetherto/wdk-pricing-coingecko-http';

/**
 * Real USD pricing, via WDK's CoinGecko pricing client — per the Phase 1 PRD
 * ("We have two pricing clients available in WDK: wdk-pricing-bitfinex-http
 * and wdk-pricing-coingecko-http. Let's use coingecko for now.").
 *
 * Works WITHOUT an API key (CoinGecko's public host, subject to their free-
 * tier rate limit — roughly 10-30 req/min). Set EXPO_PUBLIC_COINGECKO_API_KEY
 * for a Demo key (higher limits) once you have one — see
 * https://docs.coingecko.com/docs/setting-up-your-api-key. Not required to
 * get real prices working today.
 */
const pricingClient = new CoingeckoPricingClient({
  // USDT0 (Tether's newer cross-chain token, used on Arbitrum — see
  // wdk/assets.ts) is NOT in the package's built-in symbol map (only
  // BTC/ETH/USDT/XAUT/USAT are). It's the same underlying dollar-pegged
  // asset as USDT, so price it the same way — CoinGecko's own coin id for
  // Tether is 'tether' (confirmed directly against their API docs).
  coinIds: { USDT0: 'tether' },
  ...(process.env.EXPO_PUBLIC_COINGECKO_API_KEY
    ? { apiKey: process.env.EXPO_PUBLIC_COINGECKO_API_KEY }
    : {}),
});

/**
 * Current USD price for each of the given symbols (e.g. ['BTC', 'ETH']).
 * Returns a map so callers don't need to worry about result ordering.
 * Refetches periodically since prices move — a 60s stale time balances
 * freshness against CoinGecko's free-tier rate limit.
 */
export function usePrices(symbols: string[]) {
  const key = [...symbols].sort().join(',');

  const query = useQuery({
    queryKey: ['prices', key],
    queryFn: async () => {
      const list = symbols.map((symbol) => ({ from: symbol, to: 'USD' }));
      const results = await pricingClient.getMultiCurrentPrices(list);
      const map: Record<string, number | null> = {};
      symbols.forEach((symbol, i) => {
        map[symbol] = results[i];
      });
      return map;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled: symbols.length > 0,
  });

  return {
    prices: query.data ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
