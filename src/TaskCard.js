// src/TaskCard.js
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from './colors';

export default function TaskCard({ title, due, priority, done, onToggle }) {
  const dotColor =
    priority === 'High'   ? COLORS.danger
  : priority === 'Medium' ? COLORS.warning
  :                         COLORS.success;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onToggle}>
      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        <Feather
          name={done ? 'check-circle' : 'circle'}
          size={22}
          color={done ? COLORS.success : COLORS.textLight}
        />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
        <Text style={styles.sub}>Due in {due} · {priority} priority</Text>
      </View>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  checkbox: { marginRight: SPACING.md },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.textLight },
  sub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: SPACING.sm },
});