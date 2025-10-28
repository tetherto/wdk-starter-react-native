import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

export interface KeyboardState {
  isVisible: boolean;
  height: number;
}

/**
 * Custom hook to detect keyboard visibility and height
 */
export function useKeyboard(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardState({
        isVisible: true,
        height: event.endCoordinates.height,
      });
    };

    const onKeyboardHide = () => {
      setKeyboardState({
        isVisible: false,
        height: 0,
      });
    };

    const showListener = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideListener = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return keyboardState;
}
