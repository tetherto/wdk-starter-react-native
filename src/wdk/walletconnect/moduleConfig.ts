import { Paths } from 'expo-file-system';

/**
 * Runtime config handed to the WalletConnect worklet module
 * (`modules/walletconnect`) when the wallet is unlocked.
 *
 * Kept free of any import from `wdk/networks.ts`, which imports this file.
 */

/** The name the module is registered under in wdk.config.js. */
export const WALLETCONNECT_MODULE = 'walletconnect';

const projectId = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

/** False until EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID is set in .env. */
export const isWalletConnectConfigured = projectId.length > 0;

/**
 * Where the module persists pairings and sessions. The worklet has no
 * reliable notion of an app-writable directory of its own, so the app passes
 * one in. Without a path WalletConnect keeps sessions in memory only.
 */
function storagePath(): string | undefined {
  try {
    const documentPath = decodeURIComponent(Paths.document.uri.replace(/^file:\/\//, ''));
    return `${documentPath.replace(/\/$/, '')}/walletconnect`;
  } catch {
    return undefined;
  }
}

export const walletConnectModuleConfig: Record<string, unknown> | null = isWalletConnectConfigured
  ? {
      projectId,
      storagePath: storagePath(),
      // Shown to the user by the dApp when it asks to connect.
      metadata: {
        name: 'WDK Starter Wallet',
        description: 'WDK React Native starter wallet',
        url: 'https://wdk.tether.io',
        icons: [],
      },
    }
  : null;
