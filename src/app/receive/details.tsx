import { QRCode } from '@tetherto/wdk-uikit-react-native';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Copy, Share, X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Share as RNShare, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { colors } from '@/constants/colors';

export default function ReceiveQRCodeScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const params = useLocalSearchParams();

  const { tokenName, networkName, address } = params as {
    tokenName: string;
    networkName: string;
    address: string;
  };

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleClose = useCallback(() => {
    // Navigate back to wallet screen (go back multiple screens)
    router.dismissAll();
  }, [router]);

  const handleCopyAddress = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      console.error('Error copying address:', error);
      toast.error('Failed to copy address');
    }
  }, [address]);

  const handleShareAddress = useCallback(async () => {
    try {
      await RNShare.share({
        message: `${tokenName} Address (${networkName}): ${address}`,
        title: `${tokenName} Receive Address`,
      });
    } catch (error) {
      console.error('Error sharing address:', error);
    }
  }, [address, tokenName, networkName]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receive funds</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>
            You&apos;re about to receive {tokenName} on {networkName}
          </Text>
        </View>

        <QRCode
          value={address}
          label="Scan QR code"
          size={200}
          color={colors.primary}
          containerStyle={styles.qrSection}
        />

        <View style={styles.addressSection}>
          <View style={styles.addressContainer}>
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {address}
            </Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.copyButton]}
              onPress={handleCopyAddress}
              activeOpacity={0.7}
            >
              <Copy size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={handleShareAddress}
              activeOpacity={0.7}
            >
              <Share size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 28,
    textAlign: 'left',
  },
  qrSection: {
    marginBottom: 40,
  },
  addressSection: {
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  addressContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  copyButton: {
    backgroundColor: colors.primary,
  },
  shareButton: {
    backgroundColor: colors.textTertiary,
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
