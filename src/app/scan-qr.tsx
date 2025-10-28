import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams } from 'expo-router';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const qrSize = screenWidth * 0.7;

export default function ScanQRScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();
  const { returnRoute, ...params } = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    ({ type, data }: { type: string; data: string }) => {
      if (scanned) return;

      setScanned(true);

      // Validate if it's a valid address format (basic validation)
      if (!data || data.length < 10) {
        Alert.alert('Invalid QR Code', 'The scanned QR code does not contain a valid address.', [
          {
            text: 'Try Again',
            onPress: () => setScanned(false),
          },
        ]);
        return;
      }

      // Navigate back with the scanned address
      if (returnRoute) {
        router.replace({
          pathname: returnRoute as any,
          params: { scannedAddress: data, ...params },
        });
      } else {
        // Fallback - navigate to send flow starting with token selection
        router.replace({
          pathname: '/send/select-token',
          params: { scannedAddress: data, ...params },
        });
      }
    },
    [scanned, router, returnRoute, params]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access to scan QR codes for wallet addresses.'
      );
    }
  }, [requestPermission]);

  // Show loading while checking permission
  if (permission === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.centerText}>Checking camera permission...</Text>
        </View>
      </View>
    );
  }

  // Show permission request if not granted
  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.centerTitle}>Camera Permission Required</Text>
          <Text style={styles.centerText}>
            Please allow camera access to scan QR codes for wallet addresses.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#FF6501" />
        </TouchableOpacity>
      </View>

      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.title}>Scan QR code to make payment.</Text>
        <Text style={styles.subtitle}>Hold your phone up to the QR code.</Text>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back" onBarcodeScanned={handleBarCodeScanned}>
          {/* Custom Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              {/* Corner borders */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <View style={styles.scanInfo}>
              <Text style={styles.scanLabel}>Scan address</Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection} />
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
  headerSpacer: {
    width: 24,
  },
  closeButton: {
    padding: 4,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scanFrame: {
    width: qrSize,
    height: qrSize,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: colors.white,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanInfo: {
    marginTop: 30,
    alignItems: 'center',
  },
  scanLabel: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  bottomLine: {
    width: 100,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  centerText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
