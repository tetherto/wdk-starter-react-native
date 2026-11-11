import { NETWORKS, type NetworkId } from '../networks';
import type { SupportedNamespace } from './types';

/** The signing methods this wallet answers. Anything else is rejected. */
const EVM_METHODS = ['personal_sign', 'eth_signTypedData_v4'];
const EVM_EVENTS = ['chainChanged', 'accountsChanged'];

/**
 * CAIP-2 chain → the app's network key, for every EVM network that is
 * configured. A network without its provider or bundler URL can't create an
 * account, so offering it to a dApp would only produce requests the wallet
 * can't sign.
 */
const NETWORK_BY_CHAIN = new Map<string, NetworkId>(
  NETWORKS.flatMap((n) =>
    n.kind === 'evm' && n.evm?.provider && n.evm.bundlerUrl
      ? [[`eip155:${n.evm.chainId}`, n.network] as [string, NetworkId]]
      : [],
  ),
);

export const EVM_CHAINS = Array.from(NETWORK_BY_CHAIN.keys());

/** Any EVM network works for address lookups: one address on all of them. */
export const FIRST_EVM_NETWORK: NetworkId | undefined = NETWORK_BY_CHAIN.values().next().value;

export function networkForChain(chainId: string): NetworkId | undefined {
  return NETWORK_BY_CHAIN.get(chainId);
}

/** What the wallet offers a dApp: every EVM network, for one address. */
export function supportedNamespacesFor(address: string): Record<string, SupportedNamespace> {
  return {
    eip155: {
      chains: EVM_CHAINS,
      methods: EVM_METHODS,
      events: EVM_EVENTS,
      accounts: EVM_CHAINS.map((chain) => `${chain}:${address}`),
    },
  };
}
