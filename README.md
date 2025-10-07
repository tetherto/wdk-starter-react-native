# @tetherto/wdk-starter-react-native

A production-ready Expo + React Native starter showing how to build a multi-chain wallet using WDK via BareKit worklets, and secure secret management. It includes background worklets, wallet creation/import flows, balances, transactions, and a modular service layer.

Click below to see the wallet in action:

[![Demo Video](assets/docs/demo-thumbnail.png)](assets/docs/demo.mp4)

## 🔍 About WDK

This repository is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control. 

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

### Multi-Chain Support
- **Bitcoin**: SegWit native transfers
- **Ethereum**: Transactions with gas fees sponsorship
- **Polygon**: Transactions with gas fees sponsorship  
- **Arbitrum**: Transactions with gas fees sponsorship
- **TON**: Native transfers

### Multi-Token Support
- **BTC**: Native transfers
- **USD₮**: Transactions with gas fees sponsorship
- **XAU₮**: Transactions with gas fees sponsorship

### Wallet Management
- **Secure Seed Generation**: Cryptographically secure entropy generation
- **Seed Import**: Import existing 12-word mnemonic phrases
- **Encrypted Storage**: Secure key storage via [`@tetherto/wdk-secret-manager`](https://github.com/tetherto/wdk-secret-manager)
- **Multi-Account Support**: Derive multiple accounts from single seed

### Asset Management
- **Multi-Token Support**: BTC, USD₮, XAU₮ with native token support
- **Real-Time Balances**: Live balance updates via [WDK Indexer](https://indexer.wallet.tether.io/)
- **Transaction History**: Complete transaction tracking and history
- **Price Conversion**: Real-time fiat pricing via Bitfinex provider

### User Experience
- **QR Code Scanner**: Scan addresses and payment requests via camera
- **Send/Receive Flows**: Intuitive transfer interfaces
- **Network Selection**: Choose optimal network for each transaction
- **Token Selection**: Multi-token transfer support
- **Activity Feed**: Real-time transaction monitoring

## 🧱 Platform Prerequisites

- Node.js 18+
- iOS: Xcode toolchain; Android: SDK + NDK (see `app.json` build properties)
- `npx` for bundling worklets via `bare-pack`

## ⬇️ Installation

```bash
npm install
```

## 🔑 Environment Setup

**Required:** Before running the app, you should create an environment file:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and replace PUT_WDK_API_KEY_HERE with your actual API key
# EXPO_PUBLIC_WDK_INDEXER_API_KEY=your_actual_api_key_here
```

**Note:** The WDK Indexer API key is used for balance and transaction API requests. Even if not mandatory for development, read how you can obtain your WDK Indexer API key in the [WDK docs](https://docs.wallet.tether.io/). 

## 🚀 Run

Generate the Secret Manager worklet bundle (needed after fresh clone or changes):

```bash
npm run gen:bundle
```

Then start the app:

```bash
# iOS simulator
npm run ios

# Android emulator/device
npm run android
```

## 📁 Project Structure

```
src/
├── app/                         # Screens (Expo Router)
├── components/                  # UI components
├── config/                      # Chains/networks config
├── contexts/                    # React contexts
├── services/
│   └── wdk-service/             # Worklet + HRPC + wallet orchestration
├── spec/                        # HRPC/schema (copied for reference)
├── worklet/                     # Secret manager worklet entry
└── wdk-secret-manager-worklet.bundle.js  # Generated bundle
```

## 🌐 Supported Networks & Operations

### Bitcoin (BTC)
- **Address Resolution**: SegWit addresses (native)
- **Balance Fetching**: ✅ Supported
- **Transaction History**: ✅ Supported  
- **Sending**: ✅ Native SegWit transfers
- **Receiving**: ✅ Native SegWit addresses

### Tether USD (USD₮)
- **Networks**: Ethereum, Polygon, Arbitrum, TON
- **Address Resolution**: ✅ All supported networks
- **Balance Fetching**: ✅ All supported networks
- **Transaction History**: ✅ All supported networks
- **Sending**: ✅ Account Abstraction (EVM networks), Native (TON)
- **Receiving**: ✅ All supported networks

### Tether Gold (XAU₮)
- **Networks**: Ethereum
- **Address Resolution**: ✅ Ethereum
- **Balance Fetching**: ✅ Ethereum
- **Transaction History**: ✅ Ethereum
- **Sending**: ✅ Ethereum
- **Receiving**: ✅ Ethereum

### Additional Networks (Coming Soon)
- **Spark**: Support Planned
- **TRON**: Support Planned
- **Solana**: Support Planned

## ⚙️ Polyfills

See `metro.config.js` for:
- Polyfills: stream, buffer, crypto, net/tls, url, http/https/http2, zlib, path, `nice-grpc`→web, `sodium-universal`→javascript, querystring, events

## 🧪 Available Scripts

- `start` – expo start --dev-client
- `android` – expo run:android
- `ios` – expo run:ios
- `web` – expo start --web
- `gen:bundle` – build secret manager worklet bundle
- `prebuild`, `prebuild:clean` – native project generation
- `lint`, `lint:fix`, `format`, `format:check`

## 🔗 Version & Compatibility

- Expo ~54, React Native 0.81.4, React 19
- Reanimated ~4.1; New Architecture enabled (`app.json`)
- Android minSdkVersion 29; build properties configured via `expo-build-properties`

## 📜 License

This project is licensed under the Apache-2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

- Read the [code of conduct](CODE_OF_CONDUCT.md)
- See [contributing guide](CONTRIBUTING.md)

## 🆘 Support

For support, please open an issue on the GitHub repository.