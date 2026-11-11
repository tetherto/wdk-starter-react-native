import { create } from 'zustand';
import type { Session, SessionProposal, SessionRequest } from '@/wdk/walletconnect/types';

/**
 * What the WalletConnect worklet module has told the app: connection
 * requests and signing requests waiting on the user, and live sessions.
 * In-memory mirror only — the module is the source of truth and the store is
 * re-filled from it on every unlock (see WalletConnectBridge).
 */
interface WalletConnectState {
  proposals: SessionProposal[];
  requests: SessionRequest[];
  sessions: Session[];
  hydrate: (state: { proposals: SessionProposal[]; requests: SessionRequest[]; sessions: Session[] }) => void;
  addProposal: (proposal: SessionProposal) => void;
  removeProposal: (id: number) => void;
  addRequest: (request: SessionRequest) => void;
  removeRequest: (id: number) => void;
  setSessions: (sessions: Session[]) => void;
  removeSession: (topic: string) => void;
  clear: () => void;
}

export const useWalletConnect = create<WalletConnectState>((set) => ({
  proposals: [],
  requests: [],
  sessions: [],

  hydrate: (state) => set(state),

  addProposal: (proposal) =>
    set((s) => ({ proposals: [...s.proposals.filter((p) => p.id !== proposal.id), proposal] })),
  removeProposal: (id) => set((s) => ({ proposals: s.proposals.filter((p) => p.id !== id) })),

  addRequest: (request) =>
    set((s) => ({ requests: [...s.requests.filter((r) => r.id !== request.id), request] })),
  removeRequest: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),

  setSessions: (sessions) => set({ sessions }),
  // A session going away takes its unanswered requests with it.
  removeSession: (topic) =>
    set((s) => ({
      sessions: s.sessions.filter((x) => x.topic !== topic),
      requests: s.requests.filter((r) => r.topic !== topic),
    })),

  clear: () => set({ proposals: [], requests: [], sessions: [] }),
}));
