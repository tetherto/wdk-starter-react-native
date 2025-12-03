import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ImportWalletScreen from '../import-wallet';
import { Alert } from 'react-native';
import { renderWithTheme } from '@/tests/utils/renderWithTheme';

test('shows alert if Import Wallet clicked with empty words', () => {
  renderWithTheme(<ImportWalletScreen />);
  const importButton = screen.getByText('Import Wallet');

  fireEvent.press(importButton);

  expect(Alert.alert).toHaveBeenCalledWith(
    'Incomplete',
    'Please fill in all 12 words of your secret phrase',
    [{ text: 'OK' }]
  );
});

