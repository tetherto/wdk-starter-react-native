'use strict'

/**
 * WalletConnect as a WDK worklet module.
 *
 * Runs inside the Bare worklet, bundled by `wdk-worklet-bundler` through the
 * `modules` entry in wdk.config.js. It owns the WalletConnect client (relay
 * socket, pairings, sessions, storage) and nothing else: it never reads the
 * seed and never signs. Proposals and signing requests are forwarded to the
 * app as module events; the app shows the approval UI, signs through the
 * normal WDK account path, and hands the result back with respondRequest().
 */

// ── Bare compatibility shims ────────────────────────────────────────────
// All of these must run BEFORE WalletConnect is required.

// 1. Bare's URLSearchParams is iterable but has no entries(), which
//    WalletConnect's pairing-URI parser calls.
if (!URLSearchParams.prototype.entries) {
  URLSearchParams.prototype.entries = function () { return this[Symbol.iterator]() }
}

// 2. Bare's URL has no `origin`. WalletConnect compares the dApp's claimed
//    origin with the verified one, so without it every dApp is reported as
//    not coming from the site it claims to be.
if (!('origin' in URL.prototype)) {
  Object.defineProperty(URL.prototype, 'origin', {
    get () { return `${this.protocol}//${this.host}` }
  })
}

// 3. `ws` opens its socket with https.get(), which bare-https only gained in
//    3.1.0 (this app's lockfile resolves an older one).
const https = require('https')
if (!https.get) {
  https.get = function (...args) {
    const request = https.request(...args)
    request.end()
    return request
  }
}

// 4. bare-node-runtime installs a global WebSocket that is a Duplex stream
//    with no onopen/onmessage/onclose. WalletConnect prefers a global
//    WebSocket over the `ws` package and captures it when it is first
//    required, so the relay socket would never report open. Point the global
//    at `ws` for the duration of the require, then put the original back.
const previousWebSocket = global.WebSocket
global.WebSocket = require('ws')
const { Core } = require('@walletconnect/core')
const { WalletKit } = require('@reown/walletkit')
const { buildApprovedNamespaces, getSdkError } = require('@walletconnect/utils')
global.WebSocket = previousWebSocket

// Shown to the user by the dApp when it asks to connect.
const METADATA = {
  name: 'WDK Starter Wallet',
  description: 'WDK React Native starter wallet',
  url: 'https://wdk.tether.io',
  icons: []
}

function verifySummary (verifyContext) {
  const verified = verifyContext && verifyContext.verified
  if (!verified) return null
  return {
    origin: verified.origin || null,
    validation: verified.validation || 'UNKNOWN',
    isScam: verified.isScam === true
  }
}

function proposalSummary (id, proposal, verifyContext) {
  return {
    id,
    proposer: (proposal.proposer && proposal.proposer.metadata) || null,
    verify: verifySummary(verifyContext)
  }
}

function sessionSummary (session) {
  return { topic: session.topic, peer: (session.peer && session.peer.metadata) || null }
}

/**
 * Module factory (the WdkModuleManager contract).
 *
 * @param {{ config: { projectId?: string, storagePath: string }, emit: (event: string, payload: unknown) => void }} ctx
 */
async function createWalletConnectModule ({ config, emit }) {
  if (typeof config.projectId !== 'string' || config.projectId.length === 0) {
    throw new Error('WalletConnect module: config.projectId is required')
  }

  const core = new Core({
    projectId: config.projectId,
    // On the Node code path WalletConnect keeps everything in memory unless a
    // database path is given, which would drop every session on restart.
    storageOptions: { database: config.storagePath }
  })

  const kit = await WalletKit.init({
    core,
    metadata: METADATA,
    // WalletConnect's one-at-a-time request queue stalls for good when the
    // relay re-delivers an already-answered request, silently dropping every
    // later request on the session. Without it each request is emitted as it
    // arrives; the app keeps its own list of what is waiting.
    signConfig: { disableRequestQueue: true }
  })

  // A re-delivered request (see signConfig above) is also written back into
  // WalletConnect's pending store, where it stays until it expires. Remember
  // what has been answered so it is never offered to the user a second time.
  const answered = new Set()

  function requestSummary (request) {
    const session = kit.getActiveSessions()[request.topic]
    return {
      id: request.id,
      topic: request.topic,
      chainId: request.params.chainId,
      method: request.params.request.method,
      params: request.params.request.params,
      peer: (session && session.peer && session.peer.metadata) || null,
      verify: verifySummary(request.verifyContext)
    }
  }

  const listeners = {
    session_proposal: ({ id, params, verifyContext }) => emit('session_proposal', proposalSummary(id, params, verifyContext)),
    session_request: (request) => emit('session_request', requestSummary(request)),
    session_delete: ({ topic }) => emit('session_delete', { topic }),
    proposal_expire: ({ id }) => emit('proposal_expire', { id }),
    session_request_expire: ({ id }) => emit('session_request_expire', { id })
  }
  for (const [event, listener] of Object.entries(listeners)) kit.on(event, listener)

  return {
    /** Start pairing from a `wc:` URI. The proposal arrives as a `session_proposal` event. */
    async pair (uri) {
      await kit.pair({ uri })
    },

    /**
     * Approve a pending proposal. `supportedNamespaces` is what the wallet is
     * willing to grant (chains, methods, events, accounts); it is intersected
     * with what the dApp asked for, and throws if a required chain or method
     * is not covered.
     */
    async approveSession ({ id, supportedNamespaces }) {
      // Typed as a record keyed by id, but returned as a plain list.
      const proposal = Object.values(kit.getPendingSessionProposals()).find((pending) => pending.id === id)
      if (!proposal) throw new Error('This connection request has expired')
      const namespaces = buildApprovedNamespaces({ proposal, supportedNamespaces })
      const session = await kit.approveSession({ id, namespaces })
      return sessionSummary(session)
    },

    async rejectSession ({ id }) {
      await kit.rejectSession({ id, reason: getSdkError('USER_REJECTED') })
    },

    async respondRequest ({ topic, id, result }) {
      await kit.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', result } })
      answered.add(id)
    },

    async rejectRequest ({ topic, id, message }) {
      const error = message ? { code: 5000, message } : getSdkError('USER_REJECTED')
      await kit.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', error } })
      answered.add(id)
    },

    async disconnect ({ topic }) {
      await kit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
    },

    getSessions () {
      return Object.values(kit.getActiveSessions()).map(sessionSummary)
    },

    // Events fired while the app was not listening (e.g. right after unlock)
    // are not replayed, so the app pulls whatever is still pending instead.
    getPendingProposals () {
      return Object.values(kit.getPendingSessionProposals()).map((proposal) => proposalSummary(proposal.id, proposal, null))
    },

    getPendingRequests () {
      return kit.getPendingSessionRequests().filter((request) => !answered.has(request.id)).map(requestSummary)
    },

    // ── Lifecycle, driven by the module runtime ──────────────────────────
    // suspend/resume follow the worklet's Bare lifecycle (app background /
    // foreground); close runs on lock and on wallet re-init.
    async suspend () {
      try { await core.relayer.transportDisconnect() } catch {}
    },

    async resume () {
      // No-op inside WalletConnect when there is nothing to subscribe to.
      await core.relayer.transportOpen()
    },

    async close () {
      for (const [event, listener] of Object.entries(listeners)) kit.off(event, listener)
      try { core.heartbeat.stop() } catch {}
      try { await core.relayer.transportDisconnect() } catch {}
    }
  }
}

module.exports = createWalletConnectModule
