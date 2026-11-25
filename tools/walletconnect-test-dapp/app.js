// WDK WalletConnect test dApp. Bundled and served by serve.mjs; see
// docs/WALLETCONNECT.md ("Testing with the test dApp").
import { SignClient } from '@walletconnect/sign-client'
import { createPublicClient, http, toHex, verifyMessage, verifyTypedData, parseEventLogs, erc20Abi, maxUint256 } from 'viem'
import { arbitrum, polygon, sepolia } from 'viem/chains'

/* global WC_PROJECT_ID */
const CHAINS = {
  'eip155:11155111': { chain: sepolia, name: 'Sepolia', rpc: 'https://ethereum-sepolia-rpc.publicnode.com', explorer: 'https://sepolia.etherscan.io/tx/' },
  'eip155:42161': { chain: arbitrum, name: 'Arbitrum', rpc: 'https://arbitrum-one-rpc.publicnode.com', explorer: 'https://arbiscan.io/tx/' },
  'eip155:137': { chain: polygon, name: 'Polygon', rpc: 'https://polygon-bor-rpc.publicnode.com', explorer: 'https://polygonscan.com/tx/' }
}
const SEPOLIA = 'eip155:11155111'
// The wallet's Sepolia test USDT (src/wdk/networks.ts).
const TEST_USDT = '0xd077A400968890Eacc75cdc901F0356c943e4fDb'
const SPENDER = '0x000000000000000000000000000000000000dEaD'
const METHODS = ['personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction']

const $ = (id) => document.getElementById(id)
let client, session, address

// ── Log ───────────────────────────────────────────────────────────────────

function log (text, cls = '', link) {
  const row = document.createElement('div')
  row.className = 'row ' + cls
  const time = document.createElement('span')
  time.className = 'time'
  time.textContent = new Date().toLocaleTimeString()
  row.append(time, ' ', text)
  if (link) {
    const a = document.createElement('a')
    a.href = link
    a.target = '_blank'
    a.rel = 'noopener'
    a.textContent = ' view ↗'
    row.append(a)
  }
  $('log').prepend(row)
}

const errorText = (e) => e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e))

// ── Session ───────────────────────────────────────────────────────────────

function approvedChains () {
  return session ? session.namespaces.eip155.chains ?? [...new Set(session.namespaces.eip155.accounts.map((a) => a.split(':').slice(0, 2).join(':')))] : []
}

const activeChain = () => $('chain').value

function render () {
  const connected = !!session
  document.body.classList.toggle('connected', connected)
  $('connect').hidden = connected
  $('disconnect').hidden = !connected
  $('wallet').textContent = connected ? session.peer.metadata.name : 'Not connected'
  $('address').textContent = connected ? address : 'Connect a wallet to run the tests.'
  $('methods').textContent = connected ? session.namespaces.eip155.methods.join(' · ') : ''

  const select = $('chain')
  const previous = select.value
  select.replaceChildren(...approvedChains().map((id) => new Option(CHAINS[id]?.name ?? id, id)))
  if (approvedChains().includes(previous)) select.value = previous
  select.hidden = !connected

  for (const test of TESTS) {
    const button = $('run-' + test.id)
    const blocked = !connected ? 'Connect first' : test.sepoliaOnly && activeChain() !== SEPOLIA ? 'Sepolia only' : ''
    button.disabled = !!blocked
    button.title = blocked
  }
}

function setSession (s) {
  session = s
  address = s ? s.namespaces.eip155.accounts[0].split(':')[2] : undefined
  if (s) $('pairing').hidden = true
  render()
}

async function connect () {
  try {
    const { uri, approval } = await client.connect({
      optionalNamespaces: {
        eip155: { chains: Object.keys(CHAINS), methods: METHODS, events: ['chainChanged', 'accountsChanged'] }
      }
    })
    $('uri').value = uri
    $('pairing').hidden = false
    log('Connection link created. Copy it and paste it in the wallet (link icon on the Wallet tab).')
    setSession(await approval())
    log(`Connected to ${session.peer.metadata.name} on ${approvedChains().map((c) => CHAINS[c]?.name ?? c).join(', ')}`, 'ok')
  } catch (e) {
    $('pairing').hidden = true
    log('Connection refused: ' + errorText(e), 'bad')
  }
}

async function disconnect () {
  try {
    await client.disconnect({ topic: session.topic, reason: { code: 6000, message: 'User disconnected' } })
  } catch (e) {
    log('Disconnect error: ' + errorText(e), 'bad')
  }
  log('Disconnected from the dApp side')
  setSession(null)
}

const request = (method, params, chainId = activeChain()) =>
  client.request({ topic: session.topic, chainId, request: { method, params } })

const publicClient = (chainId) => createPublicClient({ chain: CHAINS[chainId].chain, transport: http(CHAINS[chainId].rpc) })

// ── Checks ────────────────────────────────────────────────────────────────

class Fail extends Error {}

function expectRefusal (e, pattern) {
  const text = errorText(e)
  if (pattern && !pattern.test(text)) throw new Fail(`refused, but not for the expected reason: ${text}`)
  return `refused as expected: ${text}`
}

async function signMessage (message) {
  const signature = await request('personal_sign', [toHex(message), address])
  if (!(await verifyMessage({ address, message, signature }))) throw new Fail(`signature does not recover to ${address}`)
  return signature
}

function typedData (chainId) {
  return {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' }
      ],
      Mail: [
        { name: 'from', type: 'address' },
        { name: 'contents', type: 'string' }
      ]
    },
    primaryType: 'Mail',
    domain: { name: 'WDK test dApp', version: '1', chainId },
    message: { from: address, contents: 'Hello from the WDK test dApp' }
  }
}

/**
 * Sends a transaction and checks the hash the wallet returns: it must be a
 * real transaction on chain (the wallet waits for the bundler to include its
 * user operation), and the receipt must succeed.
 */
async function sendAndCheck (tx, check) {
  const chainId = activeChain()
  const hash = await request('eth_sendTransaction', [{ from: address, ...tx }], chainId)
  log(`Wallet returned ${hash}. Fetching the receipt…`, '', CHAINS[chainId].explorer + hash)
  const receipt = await publicClient(chainId).waitForTransactionReceipt({ hash, timeout: 60_000 })
  if (receipt.status !== 'success') throw new Fail(`transaction ${hash} has status ${receipt.status}`)
  const sender = receipt.from.toLowerCase() === address.toLowerCase() ? 'the account itself' : `bundler ${receipt.from}`
  return (await check?.(receipt)) ?? `on chain in block ${receipt.blockNumber}, sent by ${sender}`
}

// ── Tests ─────────────────────────────────────────────────────────────────
// `run` returns a detail string on success and throws on failure. `expect`
// tells the tester what to do in the wallet.

const TESTS = [
  {
    group: 'Signing',
    id: 'personal',
    title: 'Sign a text message',
    expect: 'Tap Sign. The signature must recover to your address.',
    run: async () => { await signMessage(`WDK test ${Date.now()}`); return 'signature valid' }
  },
  {
    group: 'Signing',
    id: 'burst',
    title: 'Three messages at once',
    expect: 'Three requests arrive together. Sign each one. None may be lost.',
    run: async () => {
      await Promise.all([1, 2, 3].map((n) => signMessage(`WDK burst #${n} ${Date.now()}`)))
      return 'all three signatures valid'
    }
  },
  {
    group: 'Signing',
    id: 'typed',
    title: 'Sign typed data (EIP-712)',
    expect: 'Tap Sign. The signature must recover to your address.',
    run: async () => {
      const chainId = Number(activeChain().split(':')[1])
      const data = typedData(chainId)
      const signature = await request('eth_signTypedData_v4', [address, JSON.stringify(data)])
      const { EIP712Domain, ...types } = data.types
      const valid = await verifyTypedData({ address, domain: data.domain, types, primaryType: data.primaryType, message: data.message, signature })
      if (!valid) throw new Fail('typed-data signature does not recover to the address')
      return 'signature valid'
    }
  },
  {
    group: 'Signing',
    id: 'reject',
    title: 'Reject a signature',
    expect: 'Tap Reject. The dApp must receive the rejection.',
    run: async () => {
      try {
        await signMessage('Please reject this one')
      } catch (e) {
        if (e instanceof Fail) throw e
        return expectRefusal(e, /reject/i)
      }
      throw new Fail('the request was signed instead of rejected')
    }
  },
  {
    group: 'Transactions · Sepolia',
    id: 'self',
    sepoliaOnly: true,
    title: 'Send 0 ETH to yourself',
    expect: 'Shows Send, your address, 0 ETH, Free · sponsored. Tap Send and wait for it to be included.',
    run: () => sendAndCheck({ to: address, value: '0x0' })
  },
  {
    group: 'Transactions · Sepolia',
    id: 'approve',
    sepoliaOnly: true,
    title: 'Approve 1 test USDT',
    expect: 'Shows "Token approval", 1 USDT, spender 0x…dEaD, and an approval warning. Tap Send.',
    run: () => sendAndCheck(
      { to: TEST_USDT, data: approveData(1_000_000n) },
      (receipt) => {
        const [event] = parseEventLogs({ abi: erc20Abi, eventName: 'Approval', logs: receipt.logs })
        if (!event) throw new Fail('no Approval event in the receipt')
        if (event.args.owner.toLowerCase() !== address.toLowerCase()) throw new Fail(`Approval owner is ${event.args.owner}, not the account`)
        return `Approval(${event.args.owner} → ${event.args.spender}, ${event.args.value}) emitted for the account`
      }
    )
  },
  {
    group: 'Transactions · Sepolia',
    id: 'revoke',
    sepoliaOnly: true,
    title: 'Revoke the approval (approve 0)',
    expect: 'Shows "Token approval" for 0 USDT. Tap Send.',
    run: () => sendAndCheck({ to: TEST_USDT, data: approveData(0n) })
  },
  {
    group: 'Should be refused or flagged',
    id: 'unlimited',
    sepoliaOnly: true,
    title: 'Unlimited approval warning',
    expect: 'The wallet must warn that this spends ALL of the token. Check the warning, then tap Reject.',
    run: async () => {
      try {
        await request('eth_sendTransaction', [{ from: address, to: TEST_USDT, data: approveData(maxUint256) }])
      } catch (e) {
        return expectRefusal(e, /reject/i)
      }
      throw new Fail('the unlimited approval was sent. Revoke it with "Revoke the approval".')
    }
  },
  {
    group: 'Should be refused or flagged',
    id: 'binary',
    title: 'Sign raw binary data',
    expect: 'The wallet explains it cannot sign binary data. Tap Reject.',
    run: () => refused(request('personal_sign', ['0xdeadbeef00ff', address]), /binary/i)
  },
  {
    group: 'Should be refused or flagged',
    id: 'wrongchain',
    title: 'Typed data for another chain',
    expect: 'The wallet says the typed data is for chain 1. Tap Reject.',
    run: () => refused(request('eth_signTypedData_v4', [address, JSON.stringify(typedData(1))]), /for chain 1,/i)
  },
  {
    group: 'Should be refused or flagged',
    id: 'deploy',
    sepoliaOnly: true,
    title: 'Deploy a contract',
    expect: 'The wallet says contract deployment is not supported. Tap Reject.',
    run: () => refused(request('eth_sendTransaction', [{ from: address, data: '0x6080604052' }]), /deployment/i)
  },
  {
    group: 'Should be refused or flagged',
    id: 'failing',
    sepoliaOnly: true,
    title: 'A call that would revert',
    expect: 'Transfers more test USDT than exists. Tap Send: the wallet shows an error and nothing is sent. Then tap Reject.',
    run: () => refused(
      request('eth_sendTransaction', [{ from: address, to: TEST_USDT, data: transferData(address, maxUint256) }])
    )
  }
]

function word (value) { return BigInt(value).toString(16).padStart(64, '0') }
function approveData (amount) { return '0x095ea7b3' + word(SPENDER) + word(amount) }
function transferData (to, amount) { return '0xa9059cbb' + word(to) + word(amount) }

async function refused (promise, pattern) {
  try {
    await promise
  } catch (e) {
    return expectRefusal(e, pattern)
  }
  throw new Fail('the wallet answered instead of refusing')
}

async function runTest (test) {
  const status = $('status-' + test.id)
  status.className = 'status waiting'
  status.textContent = 'Waiting for the wallet…'
  log(`${test.title}: ${test.expect}`)
  try {
    const detail = await test.run()
    status.className = 'status pass'
    status.textContent = 'Pass'
    log(`${test.title}: pass. ${detail}`, 'ok')
  } catch (e) {
    status.className = 'status fail'
    status.textContent = 'Fail'
    log(`${test.title}: fail. ${e instanceof Fail ? e.message : errorText(e)}`, 'bad')
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

function buildTests () {
  const groups = new Map()
  for (const test of TESTS) {
    if (!groups.has(test.group)) {
      const section = document.createElement('section')
      section.className = 'group'
      const h = document.createElement('h2')
      h.textContent = test.group
      section.append(h)
      $('tests').append(section)
      groups.set(test.group, section)
    }
    const card = document.createElement('div')
    card.className = 'test'
    card.innerHTML = `
      <div class="test-text">
        <div class="test-title"></div>
        <div class="test-expect"></div>
      </div>
      <div class="test-side">
        <span class="status" id="status-${test.id}">Not run</span>
        <button class="run" id="run-${test.id}">Run</button>
      </div>`
    card.querySelector('.test-title').textContent = test.title
    card.querySelector('.test-expect').textContent = test.expect
    card.querySelector('button').onclick = () => runTest(test)
    groups.get(test.group).append(card)
  }
}

async function init () {
  buildTests()
  $('connect').onclick = connect
  $('disconnect').onclick = disconnect
  $('copy').onclick = async () => { await navigator.clipboard.writeText($('uri').value); log('Link copied') }
  $('chain').onchange = render
  $('clear').onclick = () => $('log').replaceChildren()
  render()

  if (!WC_PROJECT_ID) {
    log('No WalletConnect project ID. Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID in .env and restart npm run test-dapp.', 'bad')
    $('connect').disabled = true
    return
  }
  log('Starting WalletConnect…')
  client = await SignClient.init({
    projectId: WC_PROJECT_ID,
    metadata: { name: 'WDK test dApp', description: 'WalletConnect test bench for the WDK starter wallet', url: location.origin, icons: [] }
  })
  client.on('session_delete', () => { log('The wallet disconnected the session'); setSession(null) })
  client.on('session_event', ({ params }) => log(`Wallet event: ${params.event.name} ${JSON.stringify(params.event.data)}`))
  const existing = client.session.getAll().pop()
  setSession(existing ?? null)
  log(existing ? `Restored the session with ${existing.peer.metadata.name}` : 'Ready. Press Connect.')
}

init().catch((e) => log('Could not start WalletConnect: ' + errorText(e), 'bad'))
