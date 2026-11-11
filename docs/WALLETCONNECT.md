# WalletConnect

Lets a dApp connect to the wallet over WalletConnect and ask it to sign
messages. The user approves the connection and every signature in the app.

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
- **Sign:** when a connected dApp asks for a signature, the request opens on
  its own. Anything left undecided is listed under "Waiting for you".
- **Disconnect:** from the "Connected apps" list.

## What is supported

| | |
|---|---|
| Networks | Every EVM network in `src/wdk/networks.ts` that has its provider and bundler URL set |
| Methods | `personal_sign`, `eth_signTypedData_v4` |

Not supported yet: QR scanning and `wc:` deep links, `eth_sendTransaction`,
`personal_sign` on raw binary payloads (WDK's `sign()` takes text), and
non-EVM networks. A dApp that *requires* an unsupported method or network
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
