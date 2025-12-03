import React from 'react';
import { render, RenderAPI } from '@testing-library/react-native';
import { ThemeProvider } from '@tetherto/wdk-uikit-react-native';

/**
 * Utility to render components wrapped with ThemeProvider
 * @param ui - the component to render
 */
export const renderWithTheme = (ui: React.ReactElement): RenderAPI => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};
