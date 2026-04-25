// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

/**
 * A debounced version of expo-router's useRouter hook to prevent
 * double navigation when users tap quickly on navigation buttons.
 */
export function useDebouncedNavigation(delay = 300) {
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
