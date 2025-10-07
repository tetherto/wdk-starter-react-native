const HRPC = require('../spec/hrpc');

const b4a = require('b4a');
const { getEnum } = require('../spec/schema');
const { WdkSecretManager } = require('@tetherto/wdk-secret-manager');
// eslint-disable-next-line no-undef
const { IPC } = BareKit;

const rpc = new HRPC(IPC);

const logEnums = getEnum('@wdk-secret-manager/log-type-enum');

/**
 *
 * @param {string} enable = 0|1
 * @param {logEnums} type
 * @param {string} content
 */
function sendLog(type, content) {
  rpc.commandLog({
    type: type,
    data: content,
  });
}

let enableDebugLogs = false;

function wrapConsole() {
  const logPrefix = '[WDK-SECRET-MANAGER-WORKLET]';
  const format = (...args) =>
    args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return '[Circular]';
          }
        }
        return arg;
      })
      .join(' ');

  console.error = (...args) => {
    const content = `${logPrefix} ${format(...args)}`;
    sendLog(logEnums.error, content);
  };

  console.warn = (...args) => {
    const content = `${logPrefix} ${format(...args)}`;
    sendLog(logEnums.info, content);
  };

  console.info = (...args) => {
    const content = `${logPrefix} ${format(...args)}`;
    sendLog(logEnums.info, content);
  };
  console.debug = (...args) => {
    if (!enableDebugLogs) return;
    const content = `${logPrefix} ${format(...args)}`;
    sendLog(logEnums.debug, content);
  };
}

wrapConsole();

rpc.onCommandWorkletStart(async init => {
  enableDebugLogs = !!init.enableDebugLogs;
  console.debug('Worklet started ->', init);
  return { status: 'started' };
});

rpc.onCommandGenerateAndEncrypt(async payload => {
  try {
    console.debug('encryption payload', payload);
    if (payload.derivedKey) payload.derivedKey = b4a.from(payload.derivedKey, 'hex');
    payload.salt = b4a.from(payload.salt, 'hex');
    const manager = new WdkSecretManager(payload.passkey, payload.salt);
    const entropy = payload.seedPhrase ? manager.mnemonicToEntropy(payload.seedPhrase) : null;
    const { encryptedSeed, encryptedEntropy } = await manager.generateAndEncrypt(
      entropy,
      payload.derivedKey
    );
    manager.dispose();
    return {
      encryptedSeed: b4a.toString(encryptedSeed, 'hex'),
      encryptedEntropy: b4a.toString(encryptedEntropy, 'hex'),
    };
  } catch (e) {
    throw new Error(`${e.message}: ${e.stack}`);
  }
});

rpc.onCommandDecrypt(async payload => {
  try {
    if (payload.derivedKey) payload.derivedKey = b4a.from(payload.derivedKey, 'hex');
    payload.salt = b4a.from(payload.salt, 'hex');
    const manager = new WdkSecretManager(payload.passkey, b4a.from(payload.salt, 'hex'));
    const decryptedData = manager.decrypt(
      b4a.from(payload.encryptedData, 'hex'),
      payload.derivedKey
    );
    manager.dispose();
    return {
      result: b4a.toString(decryptedData, 'hex'),
    };
  } catch (e) {
    console.error(e.message);
    return {
      result: null,
    };
  }
});
