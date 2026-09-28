// src/KPICard.js
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from './colors';

export default function KPICard({ label, value, hint, color }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.hint, { color }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 12, color: COLORS.textMuted },
  value: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  hint:  { fontSize: 11, marginTop: 2, fontWeight: '600' },
});