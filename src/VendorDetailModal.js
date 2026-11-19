// src/VendorDetailModal.js
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './colors';
import { formatMoneyFull } from './vendorService';

export default function VendorDetailModal({ visible, onClose, vendor, onBook }) {
  if (!vendor) return null;

  const handleCall = () => {
    const phoneUrl = `tel:${vendor.phone.replace(/\s/g, '')}`;
    Linking.canOpenURL(phoneUrl).then((supported) => {
      if (supported) {
        Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Call not supported', 'Your device cannot make phone calls.');
      }
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="x" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Vendor Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Feather name="briefcase" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.name}>{vendor.name}</Text>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{vendor.category}</Text>
            </View>
            
            <View style={styles.ratingRow}>
              <Feather name="star" size={16} color="#f59e0b" />
              <Text style={styles.ratingText}>{vendor.rating} / 5.0</Text>
              <View style={styles.dot} />
              <Text style={styles.distanceText}>{vendor.distance} away</Text>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Feather name="map-pin" size={16} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{vendor.address || 'Address not provided'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Feather name="clock" size={16} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Timings</Text>
                <Text style={styles.detailValue}>{vendor.timings || '9:00 AM - 11:00 PM'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Feather name="calendar" size={16} color={COLORS.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Availability</Text>
                <Text style={[styles.detailValue, { color: COLORS.success, fontWeight: '700' }]}>
                  {vendor.availability || 'Available on your date'}
                </Text>
              </View>
            </View>
          </View>

          {/* Price & Reason */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Estimated Price</Text>
            <Text style={styles.priceValue}>{formatMoneyFull(vendor.priceEstimate)}</Text>
            <Text style={styles.reasonText}>"{vendor.reason}"</Text>
          </View>

          {/* Contact Card */}
          <View style={styles.contactCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Contact Person</Text>
              <Text style={styles.contactName}>{vendor.contactName || 'Manager'}</Text>
              <Text style={styles.contactPhone}>{vendor.phone}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
              <Feather name="phone" size={20} color="#fff" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.bookBtn} onPress={() => onBook(vendor)} activeOpacity={0.85}>
            <Feather name="check-circle" size={20} color="#fff" />
            <Text style={styles.bookBtnText}>Add to My Vendors</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card,
  },
  backBtn: { padding: 8 },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg },

  header: { alignItems: 'center', marginBottom: SPACING.xl },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
  },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  categoryPill: {
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full, marginTop: 8,
  },
  categoryText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  ratingText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textMuted, marginHorizontal: 4 },
  distanceText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  detailValue: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md, marginLeft: 44 },

  priceCard: {
    backgroundColor: '#fffbeb', borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: '#fde68a', marginBottom: SPACING.lg, alignItems: 'center',
  },
  priceLabel: { fontSize: 12, fontWeight: '700', color: '#b45309', textTransform: 'uppercase' },
  priceValue: { fontSize: 28, fontWeight: '800', color: '#92400e', marginTop: 4 },
  reasonText: { fontSize: 13, color: '#b45309', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },

  contactCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  contactLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  contactName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  contactPhone: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full,
  },
  callBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  bottomBar: {
    padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: RADIUS.md,
  },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});