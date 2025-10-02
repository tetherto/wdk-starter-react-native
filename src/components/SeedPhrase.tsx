import React, { useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface SeedPhraseProps {
  words: string[];
  editable?: boolean;
  onWordChange?: (index: number, word: string) => void;
  onKeyPress?: (index: number, key: string) => void;
  isLoading?: boolean;
}

export default function SeedPhrase({
  words,
  editable = false,
  onWordChange,
  onKeyPress,
  isLoading = false,
}: SeedPhraseProps) {
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleWordChange = (index: number, text: string) => {
    if (!editable || !onWordChange) return;

    onWordChange(index, text);

    // Auto-focus next input if word is entered and not the last input
    if (text.trim() && index < words.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating secure seed phrase...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {words.map((word, index) => (
        <View key={index} style={styles.wordItem}>
          <Text style={styles.wordNumber}>{index + 1}</Text>
          {editable ? (
            <TextInput
              ref={ref => {
                inputRefs.current[index] = ref;
              }}
              style={styles.wordInput}
              value={word}
              onChangeText={text => handleWordChange(index, text)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              placeholder=""
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType={index === words.length - 1 ? 'done' : 'next'}
              onSubmitEditing={() => {
                if (index < words.length - 1) {
                  inputRefs.current[index + 1]?.focus();
                }
              }}
            />
          ) : (
            <Text style={styles.wordText}>{word}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 32,
  },
  wordItem: {
    width: '31.33%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    margin: '1%',
  },
  wordNumber: {
    color: '#666',
    fontSize: 14,
    marginRight: 6,
  },
  wordText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  wordInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
    color: '#999',
    fontSize: 16,
  },
});
