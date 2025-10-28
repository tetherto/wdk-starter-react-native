import { useTheme } from '@tetherto/wdk-uikit-react-native';
import React, { useMemo, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface SeedPhraseProps {
  words: string[];
  editable?: boolean;
  onWordChange?: (index: number, word: string) => void;
  onKeyPress?: (index: number, key: string) => void;
  isLoading?: boolean;
  hidden?: boolean;
}

export function SeedPhrase({
  words,
  editable = false,
  onWordChange,
  onKeyPress,
  isLoading = false,
  hidden = false,
}: SeedPhraseProps) {
  const { theme } = useTheme();
  const inputRefs = useRef<(React.ElementRef<typeof TextInput> | null)[]>([]);

  const handleWordChange = (index: number, text: string) => {
    if (!editable || !onWordChange) return;

    onWordChange(index, text);
  };

  const handleKeyPress = (index: number, key: string) => {
    if (!editable) return;

    if (onKeyPress) {
      onKeyPress(index, key);
    } else {
      // Handle backspace to go to previous input
      if (key === 'Backspace' && !words[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -4,
          marginBottom: theme.spacing.xl + theme.spacing.sm,
        },
        wordItem: {
          width: '31.33%',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.borderRadius.md,
          paddingVertical: theme.spacing.base,
          paddingHorizontal: theme.spacing.sm,
          margin: '1%',
        },
        wordNumber: {
          color: theme.colors.textDisabled,
          fontSize: theme.typography.fontSize.base,
          marginRight: 6,
        },
        wordText: {
          color: theme.colors.text,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.medium,
          flex: 1,
        },
        wordInput: {
          flex: 1,
          color: theme.colors.text,
          fontSize: theme.typography.fontSize.base,
          fontWeight: theme.typography.fontWeight.medium,
          padding: 0,
          margin: 0,
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 40,
          width: '100%',
        },
        loadingText: {
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.md,
        },
        ...theme.componentOverrides?.SeedPhrase,
      }),
    [theme]
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating secure seed phrase...</Text>
        </View>
      </View>
    );
  }

  const getDisplayWord = (word: string) => {
    if (!hidden || !word) return word;
    return '••••••';
  };

  return (
    <View style={styles.container}>
      {words.map((word, index) => (
        <View key={index} style={styles.wordItem}>
          <Text style={styles.wordNumber}>{index + 1}</Text>
          {editable ? (
            <TextInput
              ref={ref => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={styles.wordInput}
              value={word}
              onChangeText={text => handleWordChange(index, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              placeholder=""
              placeholderTextColor={theme.colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              secureTextEntry={hidden}
              returnKeyType={index === words.length - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                if (index < words.length - 1) {
                  inputRefs.current[index + 1]?.focus();
                }
              }}
            />
          ) : (
            <Text style={styles.wordText}>{getDisplayWord(word)}</Text>
          )}
        </View>
      ))}
    </View>
  );
}
