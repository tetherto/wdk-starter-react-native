# React Native WDK Starter 🚀

A production-ready React Native starter application demonstrating how to build a
complete wallet using WDK (Wallet Development Kit). This starter serves as a
foundation for developers who want to move quickly from idea to implementation
without rebuilding common wallet functionality from scratch.

## Features

### Core Wallet Functionality

- ✅ Multi-wallet management with Redux state management
- ✅ Wallet creation and import capabilities
- ✅ Real-time balance tracking and updates
- ✅ Transaction history and management
- ✅ Multi-network support (Bitcoin, Ethereum, Solana)
- ✅ Secure secret management integration

### UI Components

- ✅ Professional wallet interface with themed components
- ✅ Interactive wallet cards with status indicators
- ✅ Action buttons for send/receive/swap operations
- ✅ Transaction list with detailed information
- ✅ Settings and wallet management screens

### WDK Integration

- ✅ WDK bare integration for core wallet operations
- ✅ WDK Secret Manager for secure key management
- ✅ WDK React Native Passkey support
- ✅ Modular service architecture for easy customization

## Quick Start

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the development server**

   ```bash
   npx expo start
   ```

3. **Run on your preferred platform**
   - **iOS Simulator**: Press `i` in the terminal or scan QR with Expo Go
   - **Android Emulator**: Press `a` in the terminal or scan QR with Expo Go
   - **Web**: Press `w` in the terminal

## Project Structure

```
react-native-wdk-starter/
├── app/                          # Expo Router pages
│   ├── (tabs)/                  # Tab navigation screens
│   │   ├── index.tsx           # Main wallet screen
│   │   └── explore.tsx         # Settings screen
│   └── _layout.tsx             # Root layout with providers
├── components/                   # Reusable UI components
│   └── wallet/                  # Wallet-specific components
│       ├── WalletCard.tsx      # Individual wallet display
│       ├── WalletActionButton.tsx # Action buttons
│       └── TransactionItem.tsx  # Transaction list item
├── store/                       # Redux store and state management
│   ├── slices/                 # Redux slices
│   ├── services/               # API and WDK services
│   └── types/                  # TypeScript type definitions
└── ...
```

## Key Components

### Wallet Management

- **WalletCard**: Interactive wallet display with balance, network info, and
  status
- **WalletActionButton**: Consistent action buttons for wallet operations
- **TransactionItem**: Detailed transaction display with status and metadata

### State Management

- **Redux Toolkit**: Modern Redux with TypeScript support
- **WalletSlice**: Complete wallet state management
- **Async Actions**: Background wallet operations and API calls

### WDK Services

- **WDKService**: Core integration with WDK libraries
- **WalletService**: High-level wallet operation APIs
- **Modular Architecture**: Easy to extend and customize

## Customization

### Adding New Networks

```typescript
// In store/services/wdkService.ts
static getSupportedNetworks(): string[] {
  return ['bitcoin', 'ethereum', 'solana', 'your-network'];
}
```

### Extending Wallet Types

```typescript
// In store/types/wallet.types.ts
export interface Wallet {
  // Add your custom properties
  customField?: string;
}
```

### Custom UI Components

All components use themed styling and can be easily customized:

```typescript
// Example: Custom wallet card styling
const customStyles = StyleSheet.create({
  customWalletCard: {
    // Your custom styles
  },
});
```

## TODOs for Production

The starter includes TODO comments marking areas that need actual WDK
implementation:

- [ ] Replace mock data with real WDK API calls
- [ ] Implement actual transaction broadcasting
- [ ] Add proper error handling and retry logic
- [ ] Implement secure storage for wallet data
- [ ] Add biometric authentication
- [ ] Implement proper backup and recovery flows
- [ ] Add comprehensive testing suite
- [ ] Configure production security settings

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Dependencies

### Core WDK Libraries

- `@wdk/bare` - Core WDK functionality
- `@wdk/wdk-secret-manager` - Secure key management
- `@wdk/react-native-passkey-internal` - Passkey authentication
- `@wdk/react-native-ui` - WDK UI components

### State Management

- `@reduxjs/toolkit` - Modern Redux toolkit
- `react-redux` - React Redux bindings

### Navigation & UI

- `expo-router` - File-based navigation
- `@react-navigation/native` - Navigation core
- `expo` - Expo SDK

## Contributing

This starter is designed to be a foundation for your wallet application. Feel
free to:

1. Fork the repository
2. Add your customizations
3. Share improvements with the community
4. Report issues and suggest enhancements

## License

This project is intended as a demonstration and starter template. Please ensure
you comply with all relevant licenses when using WDK libraries and dependencies
in production.

---

**Built with ❤️ using WDK (Wallet Development Kit)**

For more information about WDK, visit the official documentation.
