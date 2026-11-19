// src/QRScannerModal.js
import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Alert, ActivityIndicator, Platform, Dimensions 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkInGuestByQr } from './guestsService';
import { COLORS, SPACING, RADIUS } from './colors';

const { width } = Dimensions.get('window');
const FRAME_SIZE = width * 0.7; // 70% of screen width

export default function QRScannerModal({ visible, onClose, eventId, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      // Automatically ask if not granted
      if (permission && !permission.granted) {
        requestPermission();
      }
    }
  }, [visible, permission]);

  if (!visible) return null;

  // ─── 1. Permission Loading ───
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Camera...</Text>
        </View>
      </Modal>
    );
  }

  // ─── 2. Permission Denied ───
  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <Feather name="camera-off" size={48} color={COLORS.textMuted} />
          </View>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permText}>
            To scan QR codes, please go to your iPhone Settings {'>'} Expo Go {'>'} Camera and turn it ON.
          </Text>
          
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Try Asking Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // ─── 3. Scan Handler ───
  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);

    const res = await checkInGuestByQr(data, eventId);

    if (res.ok) {
      Alert.alert('Success', `${res.data.name} checked in!`);
      if (onScanSuccess) onScanSuccess();
      onClose();
    } else {
      Alert.alert('Failed', res.error, [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
    }
  };

  // ─── 4. Camera View (The actual UI) ───
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraContainer}>
        
        {/* The Camera Itself */}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Dark Overlay to make the scanner visible */}
        <View style={styles.overlay}>
          
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan Guest QR</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Center Scanner Box */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              {/* Corner Graphics */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            
            <Text style={styles.scanHint}>
              Align the QR code within the frame to check-in.
            </Text>
          </View>

          {/* Bottom Spacer */}
          <View style={styles.bottomBar}>
            {scanned && (
              <TouchableOpacity 
                style={styles.rescanBtn} 
                onPress={() => setScanned(false)}
              >
                <Feather name="refresh-cw" size={16} color="#000" />
                <Text style={styles.rescanText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },
  
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  permTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  permText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: RADIUS.md, width: '100%', alignItems: 'center' },
  permBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: SPACING.md, padding: 12 },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 15 },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  
  // The overlay holds the UI on top of the camera
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Darkens the area outside the scan box
    justifyContent: 'space-between',
  },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 30, // Push down below notch
  },
  closeBtn: { 
    width: 44, height: 44, borderRadius: 22, 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    alignItems: 'center', justifyContent: 'center' 
  },
  topTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // The scanner frame
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  
  // The white corner brackets
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#fff' },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
  
  scanHint: { 
    marginTop: SPACING.xl, 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600', 
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    textShadowColor: 'rgba(0,0,0,0.75)', 
    textShadowRadius: 4 
  },

  bottomBar: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  rescanText: { color: '#000', fontWeight: '800', fontSize: 14 },
});