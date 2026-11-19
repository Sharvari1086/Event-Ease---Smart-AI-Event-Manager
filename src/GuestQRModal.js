// src/GuestQRModal.js
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, RADIUS } from './colors';

export default function GuestQRModal({ visible, onClose, guest, eventName }) {
  if (!visible || !guest) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={styles.title}>{guest.name}</Text>
          <Text style={styles.subtitle}>{guest.category} · {eventName || 'Event'}</Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={guest.id}
              size={200}
              color="#000"
              backgroundColor="#fff"
            />
          </View>

          <Text style={styles.hint}>Scan at the entrance to check-in.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xl,
  },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', width: '100%', maxWidth: 340,
  },
  closeBtn: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    padding: 8, backgroundColor: COLORS.background, borderRadius: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  qrWrap: {
    padding: SPACING.lg, backgroundColor: '#fff',
    borderRadius: RADIUS.lg, marginVertical: SPACING.xl,
    borderWidth: 1, borderColor: '#eee',
  },
  hint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
});