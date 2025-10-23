import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * A debounced version of expo-router's useRouter hook to prevent
 * double navigation when users tap quickly on navigation buttons.
 */
export function useDebouncedNavigation(delay = 300) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  const push = useCallback(
    (path: string | { pathname: string; params?: Record<string, any> }) => {
      if (isNavigatingRef.current) {
        return;
      }

      isNavigatingRef.current = true;
      router.push(path as any);

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, delay);
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

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, delay);
    },
    [router, delay]
  );

  const back = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }

    isNavigatingRef.current = true;
    router.back();

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, delay);
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

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, delay);
    },
    [router, delay]
  );

  return { push, replace, back, dismissAll };
}
