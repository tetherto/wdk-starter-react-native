import { useCallback, useEffect, useRef } from 'react';

type DebouncedFn = (...args: any[]) => void;

const DELAY_TIMEOUT_MS = 400;

export function useDebouncedCallback(callback: DebouncedFn, delay = DELAY_TIMEOUT_MS): DebouncedFn {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedFn = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFn;
}
