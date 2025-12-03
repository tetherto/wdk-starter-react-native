import '@testing-library/jest-native/extend-expect';

import { Alert } from 'react-native';

// Mock expo-clipboard so tests don't break when calling clipboard functions
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
}));

// Mock react-native-safe-area-context to provide default insets for tests
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-router to prevent real navigation during tests
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// Mock sonner-native toast functions to avoid actual UI rendering
jest.mock('sonner-native', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Mock Alert to prevent native alerts from breaking tests
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());