/**
 * Data-source switch. Flip to route the app's data hooks to WDK vs the mock.
 * Screens never change — they import from '@/data'; this decides what's behind.
 */
export const USE_WDK = true;
