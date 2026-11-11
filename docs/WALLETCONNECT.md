# WalletConnect

Lets a dApp connect to the wallet over WalletConnect and ask it to sign
messages. The user approves the connection and every signature in the app.

## Setup

1. Create a free project at <https://dashboard.walletconnect.com> and copy
   its project ID.
2. Set `EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env`.
3. Restart Metro with a clean cache (`npx expo start -c`) so the value is
   inlined.

Without a project ID the app still boots; the WalletConnect screen just says
it is not set up.

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
| Networks | Every EVM network in `src/wdk/networks.ts` |
| Methods | `personal_sign`, `eth_signTypedData_v4` |
| Pairing | Pasting a `wc:` link |

Not supported yet: QR scanning and `wc:` deep links, `eth_sendTransaction`,
`personal_sign` on raw binary payloads (WDK's `sign()` takes text), and
non-EVM networks. A dApp that *requires* any of these cannot connect; one
that lists them as optional can.

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
- **Bare needs three shims**, at the top of the module, all required before
  WalletConnect is loaded. Each has a comment explaining why.
- **WalletConnect's internal request queue is turned off**
  (`signConfig.disableRequestQueue`); the comment there explains why.
- **Sessions are stored on disk** under the app's document directory
  (`walletconnect/`). They are not tied to a particular seed: after
  restoring a *different* wallet, disconnect old sessions by hand.
