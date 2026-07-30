import { WdkIndexerClient, isTokenTransfersResponse, type Blockchain, type Token } from '@tetherto/wdk-indexer-http';
import { ASSETS } from './assets';

/**
 * Real WDK Indexer API integration — replaces the useWdkTransactions() stub
 * that always returned an empty array.
 *
 * Package note: @tetherto/wdk-indexer-http is NOT yet on the public npm
 * registry (confirmed directly — npm view returns "Not Found"). It's a
 * real, actively maintained package, just still GitHub-only at this stage
 * (same situation as wdk-worklet-bundler earlier in this project). Install
 * via the GitHub reference in package.json, not a plain npm version string.
 *
 * Requires a real, registered API key — see .env.example for the
 * registration link. Nothing here works without one; this is a hard
 * external dependency, not optional.
 *
 * Two real, honest limitations, not silently worked around:
 *
 * 1. Native ETH has NO transaction history via this API. The indexer's own
 *    Token type is exactly "usdt" | "xaut" | "btc" — there's no "eth". This
 *    isn't a gap in our integration; the API itself doesn't expose native
 *    ETH transfer history through this endpoint. ETH is excluded from
 *    Activity below, not silently faked as empty-but-supported.
 *
 * 2. "sepolia" is a DISTINCT blockchain value from "ethereum" in this API
 *    (unlike our own internal network key, which is just 'ethereum' for
 *    both). Since our current .env points the 'ethereum' network at
 *    Sepolia testnet (see config.ts), USDT-on-Ethereum's real transaction
 *    history must be queried under 'sepolia', not 'ethereum' — this
 *    mapping would need updating if 'ethereum' is ever repointed to real
 *    mainnet, same caveat as elsewhere in this app.
 */

let client: WdkIndexerClient | null = null;
function getClient(): WdkIndexerClient | null {
  const apiKey = process.env.EXPO_PUBLIC_WDK_INDEXER_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new WdkIndexerClient({ apiKey });
  return client;
}

/** Maps one of our own assets to the indexer's (blockchain, token) pair —
 * or null if this asset has no transaction-history equivalent in this API
 * (currently just native ETH). */
function toIndexerParams(assetId: string): { blockchain: Blockchain; token: Token } | null {
  switch (assetId) {
    case 'bitcoin-native':
      return { blockchain: 'bitcoin', token: 'btc' };
    case 'ethereum-native':
      return null; // no 'eth' token type in this API — see file header
    case 'usdt-ethereum':
      return { blockchain: 'sepolia', token: 'usdt' }; // NOT 'ethereum' — see file header
    case 'usdt0-arbitrum':
      return { blockchain: 'arbitrum', token: 'usdt' }; // API has no separate 'usdt0' token type
    case 'usdt-polygon':
      return { blockchain: 'polygon', token: 'usdt' };
    default:
      return null;
  }
}

export interface RawTransferWithAsset {
  assetId: string;
  blockchain: string;
  transactionHash: string;
  amount: string;
  timestamp: number;
  from: string | null;
  to: string | null;
  blockNumber: number | null;
}

/**
 * Fetches transfer history for every asset that HAS an indexer equivalent,
 * for the given address-per-network map, in one batched call.
 *
 * addressesByNetwork: our own internal network key ('bitcoin', 'ethereum',
 * 'arbitrum', 'polygon') -> that network's real address for the active
 * account. Needed because each asset must be checked against ITS OWN
 * address, not a single shared one.
 */
export async function fetchAllTransfers(
  addressesByNetwork: Record<string, string>,
): Promise<RawTransferWithAsset[]> {
  const indexerClient = getClient();
  if (!indexerClient) {
    throw new Error(
      'EXPO_PUBLIC_WDK_INDEXER_API_KEY is not set — register a free key at https://wdk-api.tether.io/register',
    );
  }

  const requests = ASSETS.map((asset) => {
    const params = toIndexerParams(asset.getId());
    if (!params) return null;
    const address = addressesByNetwork[asset.getNetwork()];
    if (!address) return null;
    return { ...params, address, assetId: asset.getId(), limit: 25 };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (requests.length === 0) return [];

  const results = await indexerClient.getBatchTokenTransfers(
    requests.map(({ assetId, ...rest }) => rest),
  );

  const combined: RawTransferWithAsset[] = [];
  results.forEach((result, i) => {
    if (!isTokenTransfersResponse(result)) return; // this specific asset's check failed — skip it, don't fail the whole screen
    const assetId = requests[i].assetId;
    result.transfers.forEach((t) => {
      combined.push({
        assetId,
        blockchain: t.blockchain,
        transactionHash: t.transactionHash,
        amount: t.amount,
        timestamp: t.timestamp,
        from: t.from ?? null,
        to: t.to ?? null,
        blockNumber: t.blockNumber ?? null,
      });
    });
  });

  return combined.sort((a, b) => b.timestamp - a.timestamp);
}
