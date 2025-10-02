import AsyncStorage from '@react-native-async-storage/async-storage';
import { WDKService } from './wdk-service';

const WALLET_STORAGE_KEY = '@wallet_data';
const WALLET_CREATED_KEY = '@wallet_created';

export interface WalletSetupResult {
  success: boolean;
  wallet?: any;
  error?: string;
}

/**
 * Initialize wallet with a seed phrase
 * @param seedPhrase - 12 or 24 word mnemonic phrase
 * @param walletName - Name for the wallet
 * @param passkey - Passkey to encrypt the seed (use biometric/user auth in production)
 */
export async function initializeWalletWithSeed(
  seedPhrase: string,
  walletName: string = 'My Wallet',
  passkey: string = 'default_passkey'
): Promise<WalletSetupResult> {
  try {
    // 1. Initialize WDK services
    await WDKService.initialize();

    // 2. Import the seed phrase
    const imported = await WDKService.importSeedPhrase({
      prf: passkey,
      seedPhrase: seedPhrase.trim(),
    });

    if (!imported) {
      throw new Error('Failed to import seed phrase');
    }

    // 3. Create wallet using the imported seed
    const wallet = await WDKService.createWallet({
      walletName,
      prf: passkey,
    });

    // 4. Initialize the first account (jar)
    const account = await WDKService.initializeAccountWithBalances({
      walletId: wallet.id,
      accountIndex: 0,
    });

    // 5. Save wallet info to AsyncStorage for persistence
    await AsyncStorage.setItem(
      WALLET_STORAGE_KEY,
      JSON.stringify({
        walletId: wallet.id,
        walletName: wallet.name,
        hasWallet: true,
      })
    );
    await AsyncStorage.setItem(WALLET_CREATED_KEY, 'true');

    return {
      success: true,
      wallet: {
        ...wallet,
        account,
      },
    };
  } catch (error: any) {
    console.error('Failed to initialize wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to initialize wallet',
    };
  }
}
