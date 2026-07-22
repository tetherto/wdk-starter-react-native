// src/wdk/cloud-backup/CloudKitAuthWebView.tsx
//
// Adapted from the WDK showcase's cloud-backup implementation. Logic is
// unchanged from the showcase (this is a hard-won, already-debugged flow —
// see the comments throughout); only styling was adapted to this app's
// theme system instead of the showcase's standalone colors.ts constants.
//
// Modal WebView that hosts CloudKit JS to obtain a private-database
// compatible web auth token.
//
// IMPORTANT PRIVACY NOTE on identity:
//   Apple NEVER exposes the user's real Apple ID email address through
//   CloudKit JS, by design. The only identity info available is:
//     - userRecordName: an opaque, app-scoped identifier (not human-readable)
//     - nameComponents (given/family name) — ONLY if the user opts into
//       "discoverability" AND the API token has "Request user
//       discoverability at sign in" enabled in CloudKit Dashboard
//   This component captures whatever displayName is available (a real
//   name, if discoverability was granted) and passes it up via
//   onTokenReceived's second argument. If nothing is available, the
//   caller should fall back to a generic label — there is no way to
//   show a real email address; this is an Apple platform privacy
//   guarantee, not a limitation of this implementation.
//
// CROSS-PLATFORM NOTE: unlike the showcase (which only ever renders this on
// iOS), this app lets the person pick iCloud as a provider on EITHER
// platform — this component itself has no iOS-specific API, it's just a
// WebView + JS message bridge, so it works identically on Android.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  WebView,
  type WebViewMessageEvent,
  type WebViewNavigation,
  type ShouldStartLoadRequest,
} from 'react-native-webview';
import { useTheme } from '@/theme';
import { Text } from '@/components';
import { buildCloudKitAuthHtml } from './cloudkitAuthHtml';

export const CLOUDKIT_CALLBACK_URL =
  process.env['EXPO_PUBLIC_CLOUDKIT_CALLBACK_URL'] ??
  'https://wdk-starter-react-native.app/cloudkit-callback';
// ⚠️ This URL must exactly match the "Sign in Callback" URL Redirect value
// registered for your API token in CloudKit Dashboard → Settings → Tokens &
// Keys. It doesn't need to be a real, reachable page — this component
// intercepts navigation to it before the WebView ever actually loads it (see
// handleShouldStartLoad below) — but it DOES need to match character-for-
// character what's registered with Apple, or the token will never arrive.

interface CloudKitAuthWebViewProps {
  visible: boolean;
  containerIdentifier: string;
  apiToken: string;
  environment: 'development' | 'production';
  onTokenReceived: (
    webAuthToken: string,
    identity: { displayName: string | null; userRecordName: string | null }
  ) => void;
  onError: (message: string) => void;
  onClose: () => void;
}

interface WebViewMessage {
  type:
    | 'html_loaded'
    | 'awaiting_sign_in'
    | 'already_signed_in'
    | 'sign_in_success'
    | 'token_received'
    | 'error';
  payload: any;
}

function extractTokenFromCallbackUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    return (
      params.get('ckWebAuthToken') ??
      params.get('ckAPIToken') ??
      params.get('webAuthToken') ??
      (() => {
        if (parsed.hash) {
          const fragmentParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
          return (
            fragmentParams.get('ckWebAuthToken') ??
            fragmentParams.get('webAuthToken')
          );
        }
        return null;
      })()
    );
  } catch {
    return null;
  }
}

export function CloudKitAuthWebView({
  visible,
  containerIdentifier,
  apiToken,
  environment,
  onTokenReceived,
  onError,
  onClose,
}: CloudKitAuthWebViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [statusText, setStatusText] = useState('Loading…');
  const [isLoading, setIsLoading] = useState(true);
  const tokenReceivedRef = useRef(false);

  const identityRef = useRef<{ displayName: string | null; userRecordName: string | null }>({
    displayName: null,
    userRecordName: null,
  });

  const html = useMemo(
    () => buildCloudKitAuthHtml({ containerIdentifier, apiToken, environment }),
    [containerIdentifier, apiToken, environment]
  );

  const resolveWithToken = useCallback(
    (webAuthToken: string) => {
      if (tokenReceivedRef.current) return;
      tokenReceivedRef.current = true;
      onTokenReceived(webAuthToken, identityRef.current);
    },
    [onTokenReceived]
  );

  const handleShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest): boolean => {
      if (request.url.startsWith(CLOUDKIT_CALLBACK_URL)) {
        // DEMO-SAFE LOGGING: strip query params, which carry the live
        // ckWebAuthToken — never log the token itself.
        console.log('[CloudKitAuthWebView] Intercepted callback:', request.url.split('?')[0]);
        const token = extractTokenFromCallbackUrl(request.url);
        if (token) {
          setStatusText('Signed in! Finalizing…');
          resolveWithToken(token);
        } else {
          onError(
            'Sign-in callback reached but no token found in URL. ' +
            'Raw URL: ' + request.url.slice(0, 200)
          );
        }
        return false;
      }
      return true;
    },
    [resolveWithToken, onError]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let message: WebViewMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      switch (message.type) {
        case 'html_loaded':
          setStatusText('Loading CloudKit JS…');
          break;

        case 'awaiting_sign_in':
          setStatusText('Please sign in with your Apple ID below.');
          setIsLoading(false);
          break;

        case 'already_signed_in':
          setStatusText('Already signed in. Retrieving token…');
          identityRef.current = {
            displayName: message.payload?.displayName ?? null,
            userRecordName: message.payload?.userRecordName ?? null,
          };
          break;

        case 'sign_in_success':
          setStatusText('Signed in! Retrieving token…');
          identityRef.current = {
            displayName: message.payload?.displayName ?? null,
            userRecordName: message.payload?.userRecordName ?? null,
          };
          break;

        case 'token_received':
          if (message.payload?.webAuthToken) {
            resolveWithToken(message.payload.webAuthToken);
          }
          break;

        case 'error':
          setIsLoading(false);
          onError(message.payload?.message ?? 'Unknown CloudKit JS error');
          break;
      }
    },
    [resolveWithToken, onError]
  );

  const handleNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    console.log('[CloudKitAuthWebView] navigated to:', nav.url.split('?')[0], 'loading:', nav.loading);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: theme.colors.bgPrimary, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text variant="headTitle">Sign in to iCloud</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text variant="button" color="error">Cancel</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.bgPrimary }]}>
            <ActivityIndicator color={theme.colors.brand} size="large" />
            <Text variant="body" color="textSecondary" center style={{ paddingHorizontal: 24 }}>
              {statusText}
            </Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ html }}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          originWhitelist={['*']}
          setSupportMultipleWindows={false}
          onError={(e) => onError(`WebView error: ${e.nativeEvent.description}`)}
          style={[styles.webview, { backgroundColor: theme.colors.bgPrimary }]}
        />

        {!isLoading && (
          <Text
            variant="small"
            color="textSecondary"
            center
            style={{ padding: 8, paddingBottom: insets.bottom + 8 }}
          >
            {statusText}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: { padding: 8 },
  webview: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
