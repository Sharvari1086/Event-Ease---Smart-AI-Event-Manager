// src/AddExpenseModal.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { addExpense, EXPENSE_CATEGORIES, formatMoneyFull } from './budgetService';
import { COLORS, SPACING, RADIUS } from './colors';

export default function AddExpenseModal({ visible, onClose, eventId, eventName, onAdded }) {
  const [category, setCategory] = useState('Venue');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paid, setPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setCategory('Venue');
    setAmount('');
    setNote('');
    setPaid(true);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError('');
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!eventId) {
      setError('Please select an event');
      return;
    }

    setSaving(true);
    const res = await addExpense({
      event_id: eventId,
      category,
      amount: numAmount,
      note,
      paid,
    });
    setSaving(false);

    if (!res.ok) {
      setError(res.error || 'Could not save expense');
      return;
    }

    if (onAdded) onAdded(res.data);
    handleClose();
  };

  const selectedCat = EXPENSE_CATEGORIES.find((c) => c.key === category);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
              <Feather name="x" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Add Expense</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Event label */}
            {eventName ? (
              <View style={styles.eventPill}>
                <Feather name="calendar" size={14} color={COLORS.primary} />
                <Text style={styles.eventPillText} numberOfLines={1}>
                  {eventName}
                </Text>
              </View>
            ) : null}

            {/* Big amount display */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amountCurrency}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="decimal-pad"
                  autoFocus
                  maxLength={10}
                />
              </View>
              {amount ? (
                <Text style={styles.amountPreview}>
                  {formatMoneyFull(parseFloat(amount) || 0)}
                </Text>
              ) : null}
            </View>

            {/* Category picker */}
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const active = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={[
                      styles.catCard,
                      active && { borderColor: cat.color, backgroundColor: `${cat.color}15` },
                    ]}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.catIcon,
                        { backgroundColor: active ? cat.color : `${cat.color}25` },
                      ]}
                    >
                      <Feather
                        name={cat.icon}
                        size={18}
                        color={active ? '#fff' : cat.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.catText,
                        active && { color: cat.color, fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note */}
            <Text style={styles.sectionLabel}>Note (optional)</Text>
            <View style={styles.noteWrap}>
              <Feather name="edit-3" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Paid deposit to Grand Palace"
                placeholderTextColor={COLORS.textLight}
                maxLength={120}
              />
            </View>

            {/* Paid toggle */}
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity
                onPress={() => setPaid(true)}
                style={[styles.statusBtn, paid && styles.statusBtnOn]}
                activeOpacity={0.85}
              >
                <Feather
                  name="check-circle"
                  size={18}
                  color={paid ? '#fff' : COLORS.success}
                />
                <Text
                  style={[styles.statusText, paid && { color: '#fff' }]}
                >
                  Paid
                </Text>
              </TouchableOpacity>

              <View style={{ width: 12 }} />

              <TouchableOpacity
                onPress={() => setPaid(false)}
                style={[styles.statusBtn, !paid && { backgroundColor: COLORS.warning, borderColor: COLORS.warning }]}
                activeOpacity={0.85}
              >
                <Feather
                  name="clock"
                  size={18}
                  color={!paid ? '#fff' : COLORS.warning}
                />
                <Text
                  style={[styles.statusText, !paid && { color: '#fff' }]}
                >
                  Pending
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Save button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !amount}
              style={[
                styles.saveBtn,
                { backgroundColor: selectedCat?.color || COLORS.primary },
                (saving || !amount) && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Expense</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  scroll: { padding: SPACING.lg },

  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  eventPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    maxWidth: 240,
  },

  // Amount
  amountCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  amountCurrency: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.text,
    minWidth: 100,
    padding: 0,
    textAlign: 'center',
  },
  amountPreview: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 8,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  catIcon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  catText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Note
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },

  // Status
  statusRow: { flexDirection: 'row' },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.success,
    backgroundColor: COLORS.card,
  },
  statusBtnOn: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, fontWeight: '600' },

  // Bottom
  bottomBar: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});