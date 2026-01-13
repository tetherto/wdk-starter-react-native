import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef } from 'react';

const CLEAR_CLIPBOARD_AFTER_MS = 5 * 60 * 1000; //5 mins

const normalizePhrase = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

const checkIsMnemonic = (s: string) => {
  const words = normalizePhrase(s).split(' ');
  return words.length === 12 && words.every(Boolean);
};

export function useMnemonicClipboardCleanup() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMnemonicRef = useRef<string | null>(null);

  const scheduleClearClipboard = (mnemonic: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    lastMnemonicRef.current = normalizePhrase(mnemonic);

    timerRef.current = setTimeout(async () => {
      try {
        const current = await Clipboard.getStringAsync();
        const normalizedCurrent = normalizePhrase(current);

        if (
          lastMnemonicRef.current &&
          normalizedCurrent === lastMnemonicRef.current &&
          checkIsMnemonic(normalizedCurrent)
        ) {
          await Clipboard.setStringAsync('');
        }
      } catch {}
    }, CLEAR_CLIPBOARD_AFTER_MS);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { scheduleClearClipboard };
}
