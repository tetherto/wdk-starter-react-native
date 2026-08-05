// src/wdk/cloud-backup/CloudBackupContext.tsx
//
// Manages cloud authentication state and exposes all backup operations.
//
// ADAPTED FROM THE WDK SHOWCASE: the showcase hard-gates by Platform.OS
// (iOS -> CloudKit only, Android -> Google Drive only). This app instead
// lets the PERSON CHOOSE either provider on either platform. Neither
// provider is actually platform-locked at a technical level — see the
// original design notes below.
//
// IMPORTANT — every operation below takes `provider` as an EXPLICIT
// argument, not read from component state. An earlier version stored the
// chosen provider in state (via selectProvider) and had authenticate()/
// buildSdk() read it back out of `state.provider` — but calling
// selectProvider(provider) and then immediately authenticate() in the same
// function doesn't work: React state updates are not synchronous, so
// authenticate() ran against the PREVIOUS render's state.provider, one step
// behind whatever was just tapped. That caused exactly the "tapping iCloud
// opens Google, tapping Google opens iCloud" bug — each call used the
// provider from the tap BEFORE the current one. Passing `provider` as a
// plain function argument removes the race entirely: there's no state
// update to wait for.
//
//   - CloudKit access here goes through a WebView running CloudKit JS with a
//     web-based Apple ID sign-in (see CloudKitAuthWebView.tsx) — no
//     native-iOS-only API involved, so it works identically on Android.
//   - Google Sign-In (@react-native-google-signin/google-signin) is a
//     genuinely cross-platform library.
//
// Multi-wallet support:
//   Every operation (upload, download, delete, exists) accepts a walletId.
//   The walletId is used to derive a unique record/file name per wallet:
//     CloudKit: recordName = "wallet_<walletId_base64>"
//     Drive:    filePath   = "wallet_<walletId_base64>.json"
//
// Required .env variables:
//   EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID     (for the iCloud option)
//   EXPO_PUBLIC_CLOUDKIT_API_TOKEN        (for the iCloud option)
//   EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL     (for the iCloud option)
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID       (for the Google Drive option, BOTH platforms)
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID      (for the Google Drive option, iOS ONLY —
//                                          the showcase never needed this because it
//                                          only ever ran Google Sign-In on Android;
//                                          iOS additionally requires either this or a
//                                          bundled GoogleService-Info.plist)
//
// This app does NOT use a fixed EXPO_PUBLIC_CLOUD_BACKUP_PASSPHRASE like the
// showcase — the payload is encrypted with the PERSON'S OWN app password
// (see cloud-provider.tsx, via passwordVault.getAppPassword()).

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import {
  CloudBackup,
  GoogleDriveProvider,
  CloudKitProvider,
  CloudAuthError,
} from '@tetherto/wdk-backup-cloud';
import type { CloudEncryptionKeyFile } from '@tetherto/wdk-backup-cloud';
import { CloudKitAuthWebView } from './CloudKitAuthWebView';

export type CloudProvider = 'icloud' | 'gdrive';

// ─── Environment variables ────────────────────────────────────────────────────

const CLOUDKIT_CONTAINER_ID = process.env['EXPO_PUBLIC_CLOUDKIT_CONTAINER_ID'] ?? '';
const CLOUDKIT_API_TOKEN = process.env['EXPO_PUBLIC_CLOUDKIT_API_TOKEN'] ?? '';

const CLOUDKIT_ENVIRONMENT: 'development' | 'production' =
  __DEV__ ? 'development' : 'production';

const GOOGLE_WEB_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'] ?? '';
// iOS-only credential — see the file header note above.
const GOOGLE_IOS_CLIENT_ID = process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'] ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function walletStorageKey(walletId: string): string {
  const encoded = btoa(walletId)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `wallet_${encoded}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BackupOperationStatus =
  | 'idle'
  | 'checking'
  | 'uploading'
  | 'downloading'
  | 'deleting'
  | 'error';

interface CloudBackupState {
  /** For UI display only (e.g. "connected to iCloud") — NOT read internally
   *  by any operation below; every operation takes provider as an argument. */
  provider: CloudProvider | null;
  isAuthenticated: boolean;
  accountEmail: string | null;
  operationStatus: BackupOperationStatus;
  backupMetadata: CloudEncryptionKeyFile | null;
  lastError: string | null;
}

export interface CloudBackupContextValue extends CloudBackupState {
  /** UI-display convenience only — does not affect any operation below. */
  selectProvider: (provider: CloudProvider) => void;
  checkAccountStatus: (provider: CloudProvider) => Promise<{ available: boolean; email: string | null; reason?: string }>;
  authenticate: (provider: CloudProvider) => Promise<boolean>;
  signOut: (provider: CloudProvider) => Promise<void>;
  uploadBackup: (encryptedKey: string, walletId: string, provider: CloudProvider) => Promise<CloudEncryptionKeyFile | null>;
  downloadBackup: (walletId: string, provider: CloudProvider) => Promise<CloudEncryptionKeyFile | null>;
  deleteBackup: (walletId: string, provider: CloudProvider) => Promise<void>;
  checkExists: (walletId: string, provider: CloudProvider) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CloudBackupContext = createContext<CloudBackupContextValue | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CloudBackupProvider({ children }: { children: ReactNode }) {
  const iosWebAuthToken = useRef<string | null>(null); // set when authenticating with 'icloud'
  const androidAccessToken = useRef<string | null>(null); // set when authenticating with 'gdrive'

  const [state, setState] = useState<CloudBackupState>({
    provider: null,
    isAuthenticated: false,
    accountEmail: null,
    operationStatus: 'idle',
    backupMetadata: null,
    lastError: null,
  });

  const [webViewVisible, setWebViewVisible] = useState(false);
  const [webViewSessionKey, setWebViewSessionKey] = useState(0);
  const authPromiseRef = useRef<{ resolve: (success: boolean) => void } | null>(null);

  const googleConfigured = useRef(false);

  const ensureGoogleConfigured = useCallback(() => {
    if (googleConfigured.current) return;
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set.\nAdd it to your .env file.'
      );
    }
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      // iOS-only field — the library ignores it on Android, so it's safe to
      // always pass it. Required for Google Sign-In to work on iOS at all.
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      scopes: ['https://www.googleapis.com/auth/drive.appdata'],
      offlineAccess: false,
    });
    googleConfigured.current = true;
  }, []);

  const setError = useCallback((msg: string) => {
    setState((s) => ({ ...s, operationStatus: 'error', lastError: msg }));
  }, []);

  const setStatus = useCallback((operationStatus: BackupOperationStatus) => {
    setState((s) => ({ ...s, operationStatus, lastError: null }));
  }, []);

  const selectProvider = useCallback((provider: CloudProvider) => {
    setState((s) => ({ ...s, provider }));
  }, []);

  // ── SDK factory — provider passed explicitly, no state race ───────────────

  const buildSdk = useCallback((walletId: string, provider: CloudProvider): CloudBackup => {
    const storageKey = walletStorageKey(walletId);

    if (provider === 'icloud') {
      const webToken = iosWebAuthToken.current;
      if (!webToken) {
        throw new Error('Not authenticated. Tap "Connect iCloud" first.');
      }
      const p = new CloudKitProvider({
        containerIdentifier: CLOUDKIT_CONTAINER_ID,
        environment: CLOUDKIT_ENVIRONMENT,
        cloudEmail: state.accountEmail ?? '',
        recordName: storageKey,
        getCloudKitAuth: async () => ({
          apiToken: CLOUDKIT_API_TOKEN,
          webAuthToken: webToken,
        }),
      });
      return new CloudBackup(p);
    }

    const accessToken = androidAccessToken.current;
    if (!accessToken) {
      throw new Error('Not authenticated. Tap "Sign in with Google" first.');
    }
    const p = new GoogleDriveProvider({
      accessToken,
      cloudEmail: state.accountEmail ?? '',
      filePath: `${storageKey}.json`,
    });
    return new CloudBackup(p);
  }, [state.accountEmail]);

  // ── checkAccountStatus ────────────────────────────────────────────────────

  const checkAccountStatus = useCallback(async (provider: CloudProvider) => {
    if (provider === 'icloud') {
      if (iosWebAuthToken.current) {
        return { available: true, email: state.accountEmail };
      }
      return { available: false, email: null as string | null, reason: 'not_signed_in' };
    }

    try {
      ensureGoogleConfigured();
    } catch {
      return {
        available: false,
        email: null as string | null,
        reason: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not set in .env',
      };
    }

    try {
      const result = await GoogleSignin.signInSilently();
      if (result.type === 'success') {
        return { available: true, email: result.data.user.email };
      }
      return { available: false, email: null as string | null, reason: 'not_signed_in' };
    } catch {
      return { available: false, email: null as string | null, reason: 'not_signed_in' };
    }
  }, [ensureGoogleConfigured, state.accountEmail]);

  // ── authenticate ──────────────────────────────────────────────────────────

  const authenticate = useCallback((provider: CloudProvider): Promise<boolean> => {
    if (provider === 'icloud') {
      if (!CLOUDKIT_API_TOKEN) {
        setError(
          'EXPO_PUBLIC_CLOUDKIT_API_TOKEN is not set in .env. ' +
          'Get it from CloudKit Dashboard → Tokens & Keys.'
        );
        return Promise.resolve(false);
      }
      return new Promise<boolean>((resolve) => {
        authPromiseRef.current = { resolve };
        setWebViewVisible(true);
      });
    }

    // provider === 'gdrive'
    return (async () => {
      try {
        ensureGoogleConfigured();
      } catch (e: any) {
        setError(e.message);
        return false;
      }

      try {
        let email: string | null = null;

        try {
          const silentResult = await GoogleSignin.signInSilently();
          if (silentResult.type === 'success') {
            email = silentResult.data.user.email;
          }
        } catch {
          // fall through to full sign-in UI
        }

        if (!email) {
          const result = await GoogleSignin.signIn();
          if (result.type === 'cancelled') {
            setError('Google Sign-In was cancelled');
            return false;
          }
          if (result.type !== 'success') {
            setError('Google Sign-In did not return a user');
            return false;
          }
          email = result.data.user.email;
        }

        const scopeResult = await GoogleSignin.addScopes({
          scopes: ['https://www.googleapis.com/auth/drive.appdata'],
        });
        if (!scopeResult) {
          setError(
            'Google Drive access was not granted.\n' +
            'Please allow access to Google Drive when prompted.'
          );
          return false;
        }

        const tokens = await GoogleSignin.getTokens();
        if (!tokens.accessToken) {
          setError('Google Sign-In succeeded but no access token was returned.');
          return false;
        }

        androidAccessToken.current = tokens.accessToken;
        setState((s) => ({ ...s, isAuthenticated: true, accountEmail: email, lastError: null }));
        return true;

      } catch (e: any) {
        androidAccessToken.current = null;
        if (isErrorWithCode(e)) {
          if (e.code === statusCodes.SIGN_IN_CANCELLED) {
            setError('Google Sign-In cancelled');
          } else if (e.code === statusCodes.IN_PROGRESS) {
            setError('Sign-in already in progress. Please wait.');
          } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            setError('Google Play Services is not available on this device.');
          } else {
            setError(`Google Sign-In error (${e.code}): ${e.message}`);
          }
        } else {
          setError(e.message ?? 'Google Sign-In failed');
        }
        return false;
      }
    })();
  }, [ensureGoogleConfigured, setError]);

  // ── WebView callbacks (iCloud) ─────────────────────────────────────────────

  const handleWebViewTokenReceived = useCallback(
    (webAuthToken: string, identity: { displayName: string | null; userRecordName: string | null }) => {
      iosWebAuthToken.current = webAuthToken;
      setWebViewVisible(false);

      const displayLabel =
        identity.displayName ??
        (identity.userRecordName
          ? `iCloud (${identity.userRecordName.slice(0, 12)}…)`
          : 'iCloud account (no discoverable identity)');

      setState((s) => ({ ...s, isAuthenticated: true, accountEmail: displayLabel, lastError: null }));
      authPromiseRef.current?.resolve(true);
      authPromiseRef.current = null;
    },
    []
  );

  const handleWebViewError = useCallback((message: string) => {
    setWebViewVisible(false);
    setError(`CloudKit sign-in failed: ${message}`);
    authPromiseRef.current?.resolve(false);
    authPromiseRef.current = null;
  }, [setError]);

  const handleWebViewClose = useCallback(() => {
    setWebViewVisible(false);
    authPromiseRef.current?.resolve(false);
    authPromiseRef.current = null;
  }, []);

  // ── signOut ───────────────────────────────────────────────────────────────

  const signOut = useCallback(async (provider: CloudProvider): Promise<void> => {
    if (provider === 'icloud') {
      iosWebAuthToken.current = null;
      setWebViewSessionKey((k) => k + 1);
    } else {
      try {
        await GoogleSignin.signOut();
      } catch {
        // ignore
      }
      androidAccessToken.current = null;
    }

    setState((s) => ({
      ...s,
      isAuthenticated: false,
      accountEmail: null,
      operationStatus: 'idle',
      backupMetadata: null,
      lastError: null,
    }));
  }, []);

  // ── uploadBackup ──────────────────────────────────────────────────────────

  const uploadBackup = useCallback(
    async (encryptedKey: string, walletId: string, provider: CloudProvider): Promise<CloudEncryptionKeyFile | null> => {
      setStatus('uploading');
      try {
        const sdk = buildSdk(walletId, provider);
        const result = await sdk.uploadEncryptedKey(encryptedKey);
        setState((s) => ({ ...s, operationStatus: 'idle', backupMetadata: result, lastError: null }));
        return result;
      } catch (e: any) {
        if (e instanceof CloudAuthError) {
          iosWebAuthToken.current = null;
          androidAccessToken.current = null;
          setError(
            provider === 'icloud'
              ? 'CloudKit session expired. Tap "Connect iCloud" to reconnect.'
              : 'Google Drive token expired or missing scope. ' +
                'Tap "Sign in with Google" to get a fresh token with Drive access.'
          );
        } else {
          setError(e.message ?? 'Upload failed');
        }
        throw e;
      }
    },
    [buildSdk, setError, setStatus]
  );

  // ── downloadBackup ────────────────────────────────────────────────────────

  const downloadBackup = useCallback(
    async (walletId: string, provider: CloudProvider): Promise<CloudEncryptionKeyFile | null> => {
      setStatus('downloading');
      try {
        const sdk = buildSdk(walletId, provider);
        const result = await sdk.downloadEncryptedKey();
        setState((s) => ({ ...s, operationStatus: 'idle', backupMetadata: result, lastError: null }));
        return result;
      } catch (e: any) {
        if (e instanceof CloudAuthError) {
          iosWebAuthToken.current = null;
          androidAccessToken.current = null;
          setError(
            provider === 'icloud'
              ? 'CloudKit session expired. Tap "Connect iCloud" to reconnect.'
              : 'Google Drive token expired or missing scope. ' +
                'Tap "Sign in with Google" to get a fresh token with Drive access.'
          );
        } else {
          setError(e.message ?? 'Download failed');
        }
        throw e;
      }
    },
    [buildSdk, setError, setStatus]
  );

  // ── deleteBackup ──────────────────────────────────────────────────────────

  const deleteCloudKitRecordDirectly = useCallback(
    async (walletId: string): Promise<void> => {
      const webToken = iosWebAuthToken.current;
      if (!webToken) {
        throw new Error('Not authenticated. Tap "Connect iCloud" first.');
      }

      const recordName = walletStorageKey(walletId);
      const url =
        `https://api.apple-cloudkit.com/database/1/` +
        `${encodeURIComponent(CLOUDKIT_CONTAINER_ID)}/${CLOUDKIT_ENVIRONMENT}` +
        `/private/records/modify?ckAPIToken=${encodeURIComponent(CLOUDKIT_API_TOKEN)}`;

      const body = {
        operations: [{
          operationType: 'forceDelete',
          record: { recordType: 'WalletBackup', recordName },
        }],
        zoneID: { zoneName: '_defaultZone' },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apple-CloudKit-Web-Auth-Token': webToken,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 404) return;

      if (response.status === 401 || response.status === 403) {
        iosWebAuthToken.current = null;
        setState((s) => ({ ...s, isAuthenticated: false }));
        throw new Error('Session expired. Please reconnect your cloud account.');
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`CloudKit delete failed (${response.status}): ${text.slice(0, 300)}`);
      }

      const result = await response.json().catch(() => null);
      const opResult = result?.records?.[0];
      if (opResult?.reason && opResult?.serverErrorCode) {
        throw new Error(`CloudKit delete failed: ${opResult.serverErrorCode} — ${opResult.reason}`);
      }
    },
    []
  );

  const deleteBackup = useCallback(
    async (walletId: string, provider: CloudProvider): Promise<void> => {
      setStatus('deleting');
      try {
        if (provider === 'icloud') {
          await deleteCloudKitRecordDirectly(walletId);
        } else {
          const sdk = buildSdk(walletId, provider);
          await sdk.deleteBackup();
        }
        setState((s) => ({ ...s, operationStatus: 'idle', backupMetadata: null, lastError: null }));
      } catch (e: any) {
        setError(e.message ?? 'Delete failed');
        throw e;
      }
    },
    [buildSdk, deleteCloudKitRecordDirectly, setError, setStatus]
  );

  // ── checkExists ───────────────────────────────────────────────────────────

  const checkExists = useCallback(
    async (walletId: string, provider: CloudProvider): Promise<boolean> => {
      setStatus('checking');
      try {
        const sdk = buildSdk(walletId, provider);
        const exists = await sdk.exists();
        setStatus('idle');
        return exists;
      } catch (e: any) {
        setError(e.message ?? 'Check failed');
        return false;
      }
    },
    [buildSdk, setError, setStatus]
  );

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo<CloudBackupContextValue>(
    () => ({
      ...state,
      selectProvider,
      checkAccountStatus,
      authenticate,
      signOut,
      uploadBackup,
      downloadBackup,
      deleteBackup,
      checkExists,
    }),
    [state, selectProvider, checkAccountStatus, authenticate, signOut, uploadBackup, downloadBackup, deleteBackup, checkExists]
  );

  return (
    <CloudBackupContext.Provider value={value}>
      {children}
      <CloudKitAuthWebView
        key={webViewSessionKey}
        visible={webViewVisible}
        containerIdentifier={CLOUDKIT_CONTAINER_ID}
        apiToken={CLOUDKIT_API_TOKEN}
        environment={CLOUDKIT_ENVIRONMENT}
        onTokenReceived={handleWebViewTokenReceived}
        onError={handleWebViewError}
        onClose={handleWebViewClose}
      />
    </CloudBackupContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCloudBackup(): CloudBackupContextValue {
  const ctx = useContext(CloudBackupContext);
  if (!ctx) {
    throw new Error(
      'useCloudBackup must be called inside <CloudBackupProvider>. ' +
      'Make sure CloudBackupProvider wraps your app in _layout.tsx.'
    );
  }
  return ctx;
}
