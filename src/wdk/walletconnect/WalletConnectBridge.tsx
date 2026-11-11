import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useModule } from '@tetherto/wdk-react-native-core';
import { useWdkSession } from '@/wdk/hooks/useWdkSession';
import { useWalletConnect } from '@/state/walletConnect';
import { isWalletConnectConfigured, WALLETCONNECT_MODULE } from './moduleConfig';
import type { SessionProposal, SessionRequest, WalletConnectApi } from './types';

/**
 * Headless link between the WalletConnect worklet module and the app.
 *
 * The module only lives while the wallet is unlocked (it is constructed on
 * unlock and closed on lock), so everything here is keyed on the session
 * status: on unlock, subscribe to the module's events and pull whatever is
 * already pending; on lock, drop the local mirror.
 *
 * When something needs the user, it opens the matching screen — once per
 * item. If the user backs out without deciding, the item stays listed on the
 * WalletConnect screen instead of being pushed at them again.
 */
function Bridge() {
  const wc = useModule<WalletConnectApi>(WALLETCONNECT_MODULE);
  const { status } = useWdkSession();
  const router = useRouter();
  const pathname = usePathname();
  const unlocked = status === 'unlocked';

  const proposals = useWalletConnect((s) => s.proposals);
  const requests = useWalletConnect((s) => s.requests);
  const presented = useRef(new Set<string>());

  useEffect(() => {
    const store = useWalletConnect.getState();
    if (!unlocked) {
      store.clear();
      presented.current.clear();
      return;
    }

    let cancelled = false;
    const unsubscribe = [
      wc.on('session_proposal', (p) => useWalletConnect.getState().addProposal(p as SessionProposal)),
      wc.on('session_request', (r) => useWalletConnect.getState().addRequest(r as SessionRequest)),
      wc.on('session_delete', (e) => useWalletConnect.getState().removeSession((e as { topic: string }).topic)),
      wc.on('proposal_expire', (e) => useWalletConnect.getState().removeProposal((e as { id: number }).id)),
      wc.on('session_request_expire', (e) => useWalletConnect.getState().removeRequest((e as { id: number }).id)),
    ];

    Promise.all([wc.getPendingProposals(), wc.getPendingRequests(), wc.getSessions()])
      .then(([pendingProposals, pendingRequests, sessions]) => {
        if (cancelled) return;
        useWalletConnect.getState().hydrate({ proposals: pendingProposals, requests: pendingRequests, sessions });
      })
      .catch((e) => console.warn('[walletconnect] could not load state from the worklet module:', e?.message ?? e));

    return () => {
      cancelled = true;
      unsubscribe.forEach((off) => off());
    };
  }, [unlocked, wc]);

  // Connection requests first: a signing request can only come from a
  // session that already exists.
  const next = proposals[0]
    ? { key: `proposal:${proposals[0].id}`, route: '/walletconnect/proposal' as const }
    : requests[0]
      ? { key: `request:${requests[0].id}`, route: '/walletconnect/request' as const }
      : null;

  useEffect(() => {
    if (!unlocked || !next || presented.current.has(next.key)) return;
    // Don't stack a second decision screen on top of one that's open.
    if (pathname === '/walletconnect/proposal' || pathname === '/walletconnect/request') return;
    presented.current.add(next.key);
    router.push(next.route);
  }, [unlocked, next?.key, next?.route, pathname, router]);

  return null;
}

export function WalletConnectBridge() {
  return isWalletConnectConfigured ? <Bridge /> : null;
}
