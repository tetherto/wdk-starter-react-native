/**
 * Shapes exchanged with the WalletConnect worklet module
 * (`modules/walletconnect/index.js`). Keep the two in sync by hand.
 */

export interface PeerMetadata {
  name: string;
  description?: string;
  url: string;
  icons?: string[];
}

/** WalletConnect's Verify API result for the dApp's domain. */
export interface VerifySummary {
  origin: string | null;
  validation: 'VALID' | 'INVALID' | 'UNKNOWN';
  isScam: boolean;
}

export interface ProposalNamespace {
  chains?: string[];
  methods: string[];
  events: string[];
}

export interface SessionProposal {
  id: number;
  proposer: PeerMetadata | null;
  requiredNamespaces: Record<string, ProposalNamespace>;
  optionalNamespaces: Record<string, ProposalNamespace>;
  expiryTimestamp: number | null;
  verify: VerifySummary | null;
}

export interface SessionRequest {
  id: number;
  topic: string;
  /** CAIP-2, e.g. `eip155:11155111`. */
  chainId: string;
  method: string;
  params: unknown;
  expiryTimestamp: number | null;
  peer: PeerMetadata | null;
  verify: VerifySummary | null;
}

export interface Session {
  topic: string;
  peer: PeerMetadata | null;
  /** Unix seconds. */
  expiry: number;
  /** CAIP-10, e.g. `eip155:11155111:0xabc…`. */
  accounts: string[];
  chains: string[];
}

export interface SupportedNamespace {
  chains: string[];
  methods: string[];
  events: string[];
  accounts: string[];
}

/** The module's callable surface (each call is one IPC round trip). */
export interface WalletConnectApi {
  pair(uri: string): Promise<boolean>;
  approveSession(args: {
    id: number;
    supportedNamespaces: Record<string, SupportedNamespace>;
  }): Promise<Session>;
  rejectSession(args: { id: number }): Promise<boolean>;
  respondRequest(args: { topic: string; id: number; result: unknown }): Promise<boolean>;
  rejectRequest(args: { topic: string; id: number; message?: string }): Promise<boolean>;
  disconnect(args: { topic: string }): Promise<boolean>;
  getSessions(): Promise<Session[]>;
  getPendingProposals(): Promise<SessionProposal[]>;
  getPendingRequests(): Promise<SessionRequest[]>;
}
