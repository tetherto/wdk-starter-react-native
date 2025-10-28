import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * A debounced version of expo-router's useRouter hook to prevent
 * double navigation when users tap quickly on navigation buttons.
 */
export function useDebouncedNavigation(delay = 300) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const timeoutIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const refs = timeoutIdsRef.current;
    return () => {
      // Clear all pending timeouts on unmount
      refs.forEach(clearTimeout);
      refs.clear();
    };
  }, []);

  const push = useCallback(
    (path: string | { pathname: string; params?: Record<string, any> }) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;
      router.push(path as any);

      const timeoutId = setTimeout(() => {
        isNavigatingRef.current = false;
        timeoutIdsRef.current.delete(timeoutId);
      }, delay);
      timeoutIdsRef.current.add(timeoutId);
    },
    [router, delay]
  );

  const replace = useCallback(
    (path: string | { pathname: string; params?: Record<string, any> }) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;
      router.replace(path as any);

      const timeoutId = setTimeout(() => {
        isNavigatingRef.current = false;
        timeoutIdsRef.current.delete(timeoutId);
      }, delay);
      timeoutIdsRef.current.add(timeoutId);
    },
    [router, delay]
  );

  const back = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    router.back();

    const timeoutId = setTimeout(() => {
      isNavigatingRef.current = false;
      timeoutIdsRef.current.delete(timeoutId);
    }, delay);
    timeoutIdsRef.current.add(timeoutId);
  }, [router, delay]);

  const dismissAll = useCallback(
    (navigateTo?: string | { pathname: string; params?: Record<string, any> }) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;
      router.dismissAll();

      if (navigateTo) {
        router.replace(navigateTo as any);
      }

      const timeoutId = setTimeout(() => {
        isNavigatingRef.current = false;
        timeoutIdsRef.current.delete(timeoutId);
      }, delay);
      timeoutIdsRef.current.add(timeoutId);
    },
    [router, delay]
  );

  return { push, replace, back, dismissAll };
}
