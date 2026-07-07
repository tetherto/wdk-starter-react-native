import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { lightPalette, darkPalette, type Palette } from './palettes';
import { fonts, typography, spacing, radii, layout } from './tokens';

/**
 * Theme system.
 *
 * - Default mode is 'light' (the v2 prototype). Change DEFAULT_MODE below, or
 *   call setMode()/toggleMode() at runtime, to use dark.
 * - Both palettes share identical token names, so a theme is just a palette
 *   swap — no component touches raw colors.
 * - To follow the OS setting instead, wire `useColorScheme()` into the initial
 *   mode; left off by default so the app is deterministically v2 until changed.
 */
export type ThemeMode = 'light' | 'dark';

const DEFAULT_MODE: ThemeMode = 'light';

const palettes: Record<ThemeMode, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

export interface Theme {
  mode: ThemeMode;
  colors: Palette;
  fonts: typeof fonts;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  layout: typeof layout;
}

interface ThemeContextValue extends Theme {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = DEFAULT_MODE,
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const toggleMode = useCallback(() => setMode((m) => (m === 'light' ? 'dark' : 'light')), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: palettes[mode],
      fonts,
      typography,
      spacing,
      radii,
      layout,
      setMode,
      toggleMode,
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
