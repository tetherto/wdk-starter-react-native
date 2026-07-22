import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useResponsive } from '@/theme/responsive';

interface SeedWordInputGridProps {
  count: 12 | 24;
  words: string[];
  onChangeWords: (words: string[]) => void;
}

/**
 * Editable 2-column grid of numbered recovery-phrase word inputs — matches
 * the prototype's `.grid2` + `.fld.seed-word` combination.
 *
 * TWO distinct input behaviors, handled separately and deliberately:
 *
 * 1. PASTE (multiple whitespace-separated words land in one box at once —
 *    the raw text has 2+ words in a single onChangeText call): distribute
 *    across this box and the following ones.
 *
 * 2. TYPING one word at a time: auto-advance to the next box ONLY when the
 *    raw text ends with a trailing space — i.e. the person just pressed
 *    space to signal "done with this word." An earlier version advanced
 *    focus whenever the box's content was "a single word with no
 *    whitespace" — but that's true after EVERY keystroke while typing any
 *    word ("t", "th", "thi", "this" are all "one word, no whitespace"), so
 *    it fired on every letter and scattered a typed word one character per
 *    box across the grid. Checking for the trailing space specifically is
 *    what distinguishes "still typing this word" from "just finished it."
 */
export function SeedWordInputGrid({ count, words, onChangeWords }: SeedWordInputGridProps) {
  const theme = useTheme();
  const { moderateScale } = useResponsive();
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const gap = moderateScale(8);
  const itemPadding = moderateScale(10);

  const handleChange = (index: number, rawText: string) => {
    const parts = rawText.trim().split(/\s+/).filter(Boolean);

    if (parts.length > 1) {
      // Pasted a full phrase into this box — distribute across boxes.
      const next = [...words];
      for (let i = 0; i < parts.length && index + i < count; i++) {
        next[index + i] = parts[i];
      }
      onChangeWords(next);
      const lastFilled = Math.min(index + parts.length, count) - 1;
      if (lastFilled < count - 1) {
        inputRefs.current[lastFilled + 1]?.focus();
      } else {
        inputRefs.current[lastFilled]?.blur();
      }
      return;
    }

    // Single word, still being typed (or empty) — store the TRIMMED value
    // always, but only advance focus if the raw text had a trailing space,
    // meaning the person just finished typing this word.
    const endsWithSpace = /\s$/.test(rawText);
    const value = parts[0] ?? '';
    const next = [...words];
    next[index] = value;
    onChangeWords(next);

    if (endsWithSpace && value.length > 0 && index < count - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <View style={[styles.grid, { gap, marginVertical: moderateScale(14) }]}>
      {Array.from({ length: count }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          value={words[i] ?? ''}
          onChangeText={(text) => handleChange(i, text)}
          placeholder={String(i + 1)}
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          style={[
            styles.item,
            {
              padding: itemPadding,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.bgSecondary,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
              fontSize: moderateScale(16),
              textAlignVertical: 'center', // Android: fixes cursor rendering right-aligned in an empty centered TextInput until the first character is typed
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  item: { flexBasis: '48%', flexGrow: 1, borderWidth: 1.5, textAlign: 'center' },
});
