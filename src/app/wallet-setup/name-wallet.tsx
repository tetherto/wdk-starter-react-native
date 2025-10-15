import avatarOptions from '@/config/avatar-options';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NameWalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [walletName, setWalletName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0]);

  const handleNext = () => {
    // Pass wallet name to next screen
    router.push({
      pathname: './secure-wallet',
      params: { walletName, avatar: selectedAvatar.emoji },
    });
  };

  const isNextDisabled = walletName.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Name Your Wallet</Text>
          <Text style={styles.subtitle}>This name is just for you and can be changed later.</Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Wallet Name*</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>{selectedAvatar.emoji}</Text>
              <TextInput
                style={styles.input}
                value={walletName}
                onChangeText={setWalletName}
                placeholder="e.g., Investment Stash"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.avatarSection}>
            <Text style={styles.sectionTitle}>Choose an avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.map(avatar => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarItem,
                    { backgroundColor: avatar.color },
                    selectedAvatar.id === avatar.id && styles.selectedAvatar,
                  ]}
                  onPress={() => setSelectedAvatar(avatar)}
                >
                  <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.nextButton, isNextDisabled && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled}
        >
          <Text style={[styles.nextButtonText, isNextDisabled && styles.nextButtonTextDisabled]}>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 8,
  },
  avatarSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  avatarItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#FF6501',
  },
  avatarEmoji: {
    fontSize: 28,
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
