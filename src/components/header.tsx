import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { ChevronLeft } from 'lucide-react-native';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface HeaderProps {
  title: string;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Optional wallet switcher trigger.
   * If not provided, layout remains unchanged.
   */
  onWalletPress?: () => void;
}

const Header = (params: HeaderProps) => {
  const { title, isLoading = false, style, onWalletPress } = params;
  const router = useDebouncedNavigation();

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.header, style]}>
      {/* Back button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <ChevronLeft size={24} color={colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </View>

      {/* Right action (wallet switcher or spacer) */}
      {onWalletPress ? (
        <TouchableOpacity onPress={onWalletPress}>
          <Text style={styles.walletText}>Wallet</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    marginLeft: 4,
  },
  titleContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 2,
    right: -28,
  },
  spacer: {
    width: 60,
  },
  walletText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
