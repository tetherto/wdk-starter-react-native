'use strict'

/**
 * WalletConnect as a WDK worklet module.
 *
 * Runs inside the Bare worklet, bundled by `wdk-worklet-bundler` through the
 * `modules` entry in wdk.config.js. It owns the WalletConnect client (relay
 * socket, pairings, sessions, storage) and nothing else: it never sees a key
 * and never signs. Proposals and signing requests are forwarded to the app as
 * module events; the app shows the approval UI, signs through the normal WDK
 * account path, and hands the result back with respondRequest().
 */

// ── Bare compatibility shims ────────────────────────────────────────────
// All of these must run BEFORE WalletConnect is required.

// 1. Bare's URLSearchParams is iterable but has no entries/keys/values/
//    forEach. WalletConnect's pairing-URI parser calls entries().
if (typeof URLSearchParams !== 'undefined') {
  const proto = URLSearchParams.prototype
  if (!proto.entries) proto.entries = function () { return this[Symbol.iterator]() }
  if (!proto.keys) proto.keys = function * () { for (const [key] of this) yield key }
  if (!proto.values) proto.values = function * () { for (const [, value] of this) yield value }
  if (!proto.forEach) {
    proto.forEach = function (fn, thisArg) { for (const [key, value] of this) fn.call(thisArg, value, key, this) }
  }
}

// 2. `ws` opens its socket with http(s).get(), which bare-https only gained
//    in 3.1.0 (and this app's lockfile may resolve an older one).
for (const http of [require('http'), require('https')]) {
  if (typeof http.get !== 'function' && typeof http.request === 'function') {
    http.get = function (...args) {
      const request = http.request(...args)
      request.end()
      return request
    }
  }
}

// 3. bare-node-runtime installs a global WebSocket that is a Duplex stream
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

const DEFAULT_METADATA = {
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
    requiredNamespaces: proposal.requiredNamespaces || {},
    optionalNamespaces: proposal.optionalNamespaces || {},
    expiryTimestamp: proposal.expiryTimestamp || null,
    verify: verifySummary(verifyContext)
  }
}

function sessionSummary (session) {
  const accounts = []
  const chains = []
  for (const namespace of Object.values(session.namespaces || {})) {
    for (const account of namespace.accounts || []) accounts.push(account)
    for (const chain of namespace.chains || []) chains.push(chain)
  }
  return {
    topic: session.topic,
    peer: (session.peer && session.peer.metadata) || null,
    expiry: session.expiry,
    accounts,
    chains
  }
}

/**
 * Module factory (the WdkModuleManager contract).
 *
 * `seed` is deliberately ignored — see the file header.
 *
 * @param {{ config: { projectId?: string, storagePath?: string, metadata?: object }, emit: (event: string, payload: unknown) => void }} ctx
 */
async function createWalletConnectModule ({ config, emit }) {
  const projectId = config && config.projectId
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('WalletConnect module: config.projectId is required')
  }

  const core = new Core({
    projectId,
    logger: 'error',
    // On the Node code path WalletConnect keeps everything in memory unless a
    // database path is given, which would drop every session on restart.
    storageOptions: { database: (config && config.storagePath) || ':memory:' }
  })

  const kit = await WalletKit.init({
    core,
    metadata: { ...DEFAULT_METADATA, ...((config && config.metadata) || {}) },
    // WalletConnect holds incoming requests in an internal one-at-a-time
    // queue. The relay sometimes re-delivers a request that was already
    // answered; it lands back at the head of that queue, is recognised as a
    // duplicate and skipped, and the queue never advances again — every later
    // request on the session is silently dropped. Without the queue each new
    // request is emitted as it arrives (duplicates are still skipped), and
    // the app keeps its own list of what is waiting on the user.
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
      expiryTimestamp: request.params.request.expiryTimestamp || null,
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
      if (typeof uri !== 'string' || !uri.startsWith('wc:')) throw new Error('Not a WalletConnect URI')
      await kit.pair({ uri })
      return true
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
      return true
    },

    /** Answer a signing request with its result (e.g. the signature). */
    async respondRequest ({ topic, id, result }) {
      await kit.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', result } })
      answered.add(id)
      return true
    },

    async rejectRequest ({ topic, id, message }) {
      const error = message ? { code: 5000, message } : getSdkError('USER_REJECTED')
      await kit.respondSessionRequest({ topic, response: { id, jsonrpc: '2.0', error } })
      answered.add(id)
      return true
    },

    async disconnect ({ topic }) {
      await kit.disconnectSession({ topic, reason: getSdkError('USER_DISCONNECTED') })
      return true
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
module.exports.createWalletConnectModule = createWalletConnectModule
