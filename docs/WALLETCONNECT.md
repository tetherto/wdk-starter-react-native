# WalletConnect

Lets a dApp connect to the wallet over WalletConnect, ask it to sign
messages and send transactions. The user approves the connection, every
signature and every transaction in the app.

## Setup

1. Create a free project at <https://dashboard.walletconnect.com> and copy
   its project ID.
2. Set `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env`.
3. Restart Metro with a clean cache (`npx expo start -c`) so the value is
   inlined.

## Using it

Open the link icon at the top right of the Wallet tab.

- **Connect:** in the dApp, choose WalletConnect and copy the connection
  link (`wc:…`). Paste it in the wallet and press Connect. The dApp's
  connection request opens on its own.
- **Sign or send:** when a connected dApp asks for a signature or a
  transaction, the request opens on its own. Anything left undecided is
  listed under "Waiting for you".
- **Disconnect:** from the "Connected apps" list.

## What is supported

| | |
|---|---|
| Networks | Every EVM network in `src/wdk/networks.ts` that has its provider and bundler URL set |
| Methods | `personal_sign`, `eth_signTypedData_v4`, `eth_sendTransaction` |

Not supported yet: QR scanning and `wc:` deep links, contract deployment
through `eth_sendTransaction` (no `to`), batched calls
(`wallet_sendCalls`), `personal_sign` on raw binary payloads (WDK's
`sign()` takes text), and non-EVM networks. A dApp that *requires* an unsupported method or network
cannot connect; one that lists it as optional can.

## How it works

```
dApp ⇄ WalletConnect relay ⇄ worklet module ⇄ (events / calls) ⇄ app UI
                              modules/walletconnect        src/wdk/walletconnect
```

- **`modules/walletconnect`** is a WDK *worklet module*: it runs Reown
  WalletKit inside the Bare worklet, next to the wallets. It is bundled by
  the `modules` entry in `wdk.config.js` and configured at unlock through
  `wdkConfigs.modules` (`src/wdk/walletconnect/moduleConfig.ts`). It owns the
  relay socket, pairings, sessions and their storage. It never signs and
  never touches the seed.
- **`WalletConnectBridge`** (mounted in the root layout) subscribes to the
  module's events with `useModule('walletconnect')`, mirrors them into
  `src/state/walletConnect.ts`, and opens the approval screens.
- **Signing** goes through the normal WDK account path
  (`useAccount().sign` / `extension().signTypedData`), then the signature is
  handed back to the module with `respondRequest`.
- **Sending** (`eth_sendTransaction`) goes through the same EIP-7702
  account as the app's own sends: see below.

### How `eth_sendTransaction` works

Every EVM account here is an EOA delegated with EIP-7702 to a smart account
implementation (`@tetherto/wdk-wallet-evm-7702-gasless`). The address the
dApp sees is the user's own EOA; the delegation is signed into the first
transaction that needs it.

The dApp's `to`, `value` and `data` are sent from that account through the
bundler, with gas sponsored by the paymaster. The bundler returns a user
operation hash, so the wallet waits for it to be included and answers with
the real transaction hash. A call that would revert is refused before
anything is sent (the bundler's gas estimate fails and an `eth_call`
confirms it), and one that reverts once included is answered with an
error. Failures after the bundler accepts the operation use JSON-RPC error
-32003, not 5000 (user rejected). Details in
`src/wdk/walletconnect/requests.ts` and `sendTransaction.ts`.

What a dApp may notice: the receipt of the returned hash has the bundler as
`from` and the EntryPoint as `to`. The dApp's own contract events are in its
logs as usual, emitted for the user's address.

Sponsorship is paid by whoever owns the paymaster key in `.env`, on every
network, including Arbitrum and Polygon mainnet. A paymaster sponsorship
policy is the place to limit what dApps can spend.

### Things worth knowing before changing it

- **The module only exists while the wallet is unlocked.** The worklet
  builds modules on unlock and closes them on lock, and this app locks when
  it goes to the background. Requests sent meanwhile wait on the relay and
  arrive after the next unlock; the bridge re-reads pending items from the
  module each time.
- **Bare needs shims, and WalletConnect's request queue is turned off**
  (`signConfig.disableRequestQueue`). The comments in
  `modules/walletconnect/index.js` explain why.
- **Sessions are stored on disk** under the app's document directory
  (`walletconnect/`). They are not tied to a particular seed: after
  restoring a *different* wallet, disconnect old sessions by hand.

## Testing with the test dApp

`tools/walletconnect-test-dapp` is a local web page that plays
the dApp side and checks every answer the wallet gives: signatures are
verified, transaction hashes are looked up on Sepolia, and each case the
wallet should refuse is expected to be refused.

```sh
npm run test-dapp     # builds the page and serves it on http://localhost:8765
```

It uses the same `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` as the wallet, read
from `.env`. Press Connect, paste the link in the wallet, then run each test
and follow what it says to do in the wallet. Transaction tests run on
Sepolia only.
