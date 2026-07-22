// src/wdk/cloud-backup/cloudkitAuthHtml.ts
//
// Adapted from the WDK showcase's cloud-backup implementation — this file is
// copied essentially verbatim, since the timing/fallback logic here (the
// setTimeout retries, the postMessage fallback listener, the discoverability
// handling) represents real, already-solved bugs. Do not simplify this.
//
// CloudKit JS sign-in page, exported as a function that returns an HTML
// string for direct embedding via WebView's `source={{ html: ... }}`.
//
// WHY THIS IS A .ts FILE INSTEAD OF A STATIC .html FILE:
//
//   The previous approach used `source={require('./cloudkit-auth.html')}`.
//   In development, Metro serves required static assets through its own
//   dev server (http://localhost:8081/assets/?unstable_path=...). That
//   means the WebView's page origin becomes a localhost:8081 URL with a
//   long, unstable query string.
//
//   This breaks the CloudKit JS sign-in flow: after the user authenticates
//   with their Apple ID, CloudKit's servers attempt to redirect the WebView
//   back to the page that initiated the flow. A localhost:8081 origin is
//   not a stable, real redirect target — Apple's CloudKit Web Services
//   redirect step either refuses or fails to navigate back to it
//   (a long-documented CloudKit JS issue with non-https / localhost origins:
//   developer.apple.com/forums/thread/5655).
//
//   The fix: embed the HTML directly as a string via `source={{ html }}`.
//   This makes the WebView load the content with origin "about:blank" /
//   a stable in-memory document, with NO dependency on Metro's dev server
//   at all — this works identically in development and production builds.
//
// Configuration is baked directly into the returned string (rather than
// injected via injectedJavaScriptBeforeContentLoaded) so there is no
// race condition between content loading and config injection.

export function buildCloudKitAuthHtml(config: {
  containerIdentifier: string;
  apiToken: string;
  environment: 'development' | 'production';
}): string {
  // Escape values for safe embedding inside a <script> tag.
  // These come from our own .env, not user input, but we escape anyway
  // as a defensive measure against any characters that could break out
  // of the JS string literal.
  const safeContainerIdentifier = JSON.stringify(config.containerIdentifier);
  const safeApiToken = JSON.stringify(config.apiToken);
  const safeEnvironment = JSON.stringify(config.environment);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>CloudKit Sign In</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #0D1117;
      font-family: -apple-system, system-ui, sans-serif;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #status {
      color: #8B949E;
      font-size: 14px;
      text-align: center;
      padding: 24px;
    }
    #apple-sign-in-button {
      display: flex;
      justify-content: center;
      margin-top: 16px;
    }
    #apple-sign-out-button {
      display: none;
    }
  </style>
</head>
<body>
  <div>
    <div id="status">Loading CloudKit…</div>
    <div id="apple-sign-in-button"></div>
    <div id="apple-sign-out-button"></div>
  </div>

  <script>
    function postToRN(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
      }
    }

    function setStatus(text) {
      document.getElementById('status').textContent = text;
    }

    postToRN('html_loaded', { url: window.location.href });

    // Config baked in directly — no injectedJavaScript race condition.
    window.__CK_CONFIG__ = {
      containerIdentifier: ${safeContainerIdentifier},
      apiToken: ${safeApiToken},
      environment: ${safeEnvironment}
    };

    function cacheToken(token) {
      try { window.localStorage.setItem('__ck_token__', token); } catch (e) {}
      window.__CK_CACHED_TOKEN__ = token;
    }
    function getCachedToken() {
      if (window.__CK_CACHED_TOKEN__) return window.__CK_CACHED_TOKEN__;
      try { return window.localStorage.getItem('__ck_token__'); } catch (e) { return null; }
    }

    var tokenAlreadySent = false;
    function sendTokenIfAvailable() {
      var token = getCachedToken();
      if (token && !tokenAlreadySent) {
        tokenAlreadySent = true;
        postToRN('token_received', { webAuthToken: token });
      }
      return !!token;
    }

    // Extracts the best available display name from a userIdentity object.
    // IMPORTANT: Apple NEVER provides the user's real Apple ID email address
    // through CloudKit JS, by design, for privacy. The only identity info
    // available is:
    //   - userRecordName: an opaque per-app identifier (not human-readable)
    //   - nameComponents: the user's given/family name, but ONLY if they
    //     opted into "discoverability" during sign-in (requires the API
    //     token to have "Request user discoverability at sign in" enabled
    //     in CloudKit Dashboard, AND the user must tap 'Allow' on the
    //     resulting permission prompt)
    function extractDisplayName(userInfo) {
      if (!userInfo) return null;
      var identity = userInfo.userIdentity || userInfo;
      var nameComponents = identity && identity.nameComponents;
      if (nameComponents) {
        var parts = [nameComponents.givenName, nameComponents.familyName]
          .filter(function (p) { return !!p; });
        if (parts.length > 0) return parts.join(' ');
      }
      return null;
    }

    // Defensive fallback: if the API token's Sign In Callback is still set
    // to "Post Message" mode (rather than URL Redirect), ck-auth will call
    // window.postMessage() targeting this same window in some CloudKit JS
    // versions. We listen for it here just in case, though the recommended
    // fix is switching the token to URL Redirect mode (see
    // CloudKitAuthWebView.tsx for the corresponding interception logic).
    window.addEventListener('message', function (e) {
      try {
        if (e && e.data && e.data.ckWebAuthToken) {
          cacheToken(e.data.ckWebAuthToken);
          sendTokenIfAvailable();
        }
      } catch (err) {
        postToRN('error', { message: 'message listener error: ' + String(err) });
      }
    });

    window.addEventListener('cloudkitloaded', function () {
      try {
        var config = window.__CK_CONFIG__ || {};
        if (!config.containerIdentifier || !config.apiToken) {
          setStatus('Missing CloudKit configuration.');
          postToRN('error', { message: 'Missing containerIdentifier or apiToken' });
          return;
        }

        setStatus('Configuring CloudKit…');

        CloudKit.configure({
          containers: [{
            containerIdentifier: config.containerIdentifier,
            apiTokenAuth: {
              apiToken: config.apiToken,
              persist: true,
              // Requests permission to see the user's name (NOT email —
              // Apple never exposes real email addresses via CloudKit JS).
              // The corresponding API token in CloudKit Dashboard must also
              // have "Request user discoverability at sign in" enabled,
              // or this has no effect.
              signInButton: { id: 'apple-sign-in-button', theme: 'black' },
              signOutButton: { id: 'apple-sign-out-button', theme: 'black' },
              getAuthToken: function () {
                return getCachedToken();
              },
              putAuthToken: function (token) {
                cacheToken(token);
                sendTokenIfAvailable();
              },
            },
            environment: config.environment || 'development',
          }],
        });

        var container = CloudKit.getDefaultContainer();

        setStatus('Checking sign-in status…');

        container.setUpAuth().then(function (userInfo) {
          if (userInfo) {
            setStatus('Signed in. Finalizing…');
            postToRN('already_signed_in', {
              userRecordName: userInfo.userRecordName || null,
              displayName: extractDisplayName(userInfo),
            });
            setTimeout(sendTokenIfAvailable, 300);
          } else {
            setStatus('Please sign in with your Apple ID to continue.');
            postToRN('awaiting_sign_in', {});
          }
        }).catch(function (err) {
          setStatus('Error checking sign-in status.');
          postToRN('error', { message: String(err) });
        });

        container.whenUserSignsIn().then(function (userInfo) {
          setStatus('Signed in successfully.');
          postToRN('sign_in_success', {
            userRecordName: userInfo.userRecordName || null,
            displayName: extractDisplayName(userInfo),
          });
          setTimeout(sendTokenIfAvailable, 300);
        }).catch(function (err) {
          postToRN('error', { message: String(err) });
        });

      } catch (e) {
        setStatus('Initialization error.');
        postToRN('error', { message: String(e) });
      }
    });

    setTimeout(function () {
      sendTokenIfAvailable();
    }, 2000);
  </script>

  <script src="https://cdn.apple-cloudkit.com/ck/2/cloudkit.js" async></script>
</body>
</html>`;
}
