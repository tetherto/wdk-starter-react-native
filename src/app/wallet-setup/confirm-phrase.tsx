import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

interface WordPosition {
  position: number;
  word: string;
  options: string[];
}

export default function ConfirmPhraseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mnemonic?: string;
    walletName?: string;
    avatar?: string;
  }>();
  const [mnemonic, setMnemonic] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<{ [key: number]: string }>({});
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([]);

  useEffect(() => {
    // Parse mnemonic from params
    const mnemonicString = params.mnemonic as string;
    if (mnemonicString) {
      const words = mnemonicString.split(',');
      setMnemonic(words);

      // Select 4 random positions to verify
      const positions = [2, 4, 6, 11]; // Word #3, #5, #7, #12 (0-indexed + 1)
      const verificationWords: WordPosition[] = positions.map(pos => {
        const correctWord = words[pos];
        // Generate fake options
        const fakeWords = [
          'Galaxy',
          'Wave',
          'Stardust',
          'Whisper',
          'Nebula',
          'Resonance',
          'Comet',
          'Current',
          'Flow',
          'Zenith',
        ].filter(w => w !== correctWord);

        // Shuffle options
        const options = [correctWord, fakeWords[0], fakeWords[1]].sort(() => Math.random() - 0.5);

        return {
          position: pos + 1, // 1-indexed for display
          word: correctWord,
          options: options,
        };
      });

      setWordPositions(verificationWords);
    }
  }, [params.mnemonic]);

  const handleWordSelect = (position: number, word: string) => {
    setSelectedWords(prev => ({
      ...prev,
      [position]: word,
    }));
  };

  const isAllSelected = () => {
    return wordPositions.every(wp => selectedWords[wp.position] !== undefined);
  };

  const isCorrect = () => {
    return wordPositions.every(wp => selectedWords[wp.position] === wp.word);
  };

  const handleNext = () => {
    if (!isAllSelected()) {
      Alert.alert('Select All Words', 'Please select all the required words to continue.', [
        { text: 'OK' },
      ]);
      return;
    }

    if (!isCorrect()) {
      Alert.alert('Incorrect Words', 'Some words are incorrect. Please try again.', [
        { text: 'OK' },
      ]);
      // Reset selections for incorrect words
      const newSelections = { ...selectedWords };
      wordPositions.forEach(wp => {
        if (selectedWords[wp.position] !== wp.word) {
          delete newSelections[wp.position];
        }
      });
      setSelectedWords(newSelections);
      return;
    }

    // All correct, proceed to completion
    router.push({
      pathname: './complete',
      params: {
        walletName: params.walletName,
        avatar: params.avatar,
        mnemonic: params.mnemonic,
      },
    });
  };

  const getButtonStyle = (position: number, word: string) => {
    const selected = selectedWords[position] === word;
    const isCorrectWord = wordPositions.find(wp => wp.position === position)?.word === word;
    const hasSelected = selectedWords[position] !== undefined;

    if (selected) {
      if (isAllSelected() && !isCorrect() && !isCorrectWord) {
        return [styles.wordOption, styles.wordOptionIncorrect];
      }
      return [styles.wordOption, styles.wordOptionSelected];
    }

    return styles.wordOption;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Confirm your secret phrase</Text>

        {wordPositions.map(wp => (
          <View key={wp.position} style={styles.wordSection}>
            <Text style={styles.wordLabel}>Word #{wp.position}</Text>
            <View style={styles.optionsContainer}>
              {wp.options.map(option => (
                <TouchableOpacity
                  key={`${wp.position}-${option}`}
                  style={getButtonStyle(wp.position, option)}
                  onPress={() => handleWordSelect(wp.position, option)}
                >
                  <Text
                    style={[
                      styles.wordOptionText,
                      selectedWords[wp.position] === option && styles.wordOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, !isAllSelected() && styles.nextButtonDisabled]}
          onPress={handleNext}
        >
          <Text style={[styles.nextButtonText, !isAllSelected() && styles.nextButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6501',
    fontSize: 16,
    marginLeft: 4,
  },
  skipText: {
    color: '#FF6501',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
  },
  wordSection: {
    marginBottom: 28,
  },
  wordLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  wordOption: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  wordOptionSelected: {
    backgroundColor: 'rgba(30, 144, 255, 0.1)',
    borderColor: '#FF6501',
  },
  wordOptionIncorrect: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
  },
  wordOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  wordOptionTextSelected: {
    color: '#FF6501',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#FF6501',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#1E1E1E',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  nextButtonTextDisabled: {
    color: '#666',
  },
});
