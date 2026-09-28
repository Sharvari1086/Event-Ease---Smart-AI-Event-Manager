// src/AddGuestModal.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  addGuest, RSVP_OPTIONS, CATEGORIES, MEALS,
} from './guestsService';
import { COLORS, SPACING, RADIUS } from './colors';

export default function AddGuestModal({ visible, onClose, eventId, eventName, onAdded }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rsvp, setRsvp] = useState('pending');
  const [category, setCategory] = useState('Friend');
  const [meal, setMeal] = useState('Veg');
  const [seats, setSeats] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setRsvp('pending');
    setCategory('Friend');
    setMeal('Veg');
    setSeats('1');
    setNotes('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Guest name is required');
      return;
    }
    if (!eventId) {
      setError('Please select an event first');
      return;
    }

    setSaving(true);
    const res = await addGuest({
      event_id: eventId,
      name,
      phone,
      email,
      rsvp,
      category,
      meal,
      seats: parseInt(seats) || 1,
      notes,
    });
    setSaving(false);

    if (!res.ok) {
      setError(res.error || 'Could not save guest');
      return;
    }
    if (onAdded) onAdded(res.data);
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Top bar with Back button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={COLORS.text} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>Add Guest</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {eventName ? (
              <View style={styles.eventPill}>
                <Feather name="calendar" size={14} color={COLORS.primary} />
                <Text style={styles.eventPillText} numberOfLines={1}>
                  {eventName}
                </Text>
              </View>
            ) : null}

            {/* Name */}
            <Text style={styles.label}>Guest name *</Text>
            <View style={styles.inputWrap}>
              <Feather name="user" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={COLORS.textLight}
                autoFocus
              />
            </View>

            {/* Phone + Seats */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Phone</Text>
                <View style={styles.inputWrap}>
                  <Feather name="phone" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/[^0-9+\s]/g, ''))}
                    placeholder="+91..."
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Seats</Text>
                <View style={styles.inputWrap}>
                  <Feather name="users" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={seats}
                    onChangeText={(v) => setSeats(v.replace(/\D/g, ''))}
                    placeholder="1"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="guest@example.com"
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                  >
                    <Feather name={c.icon} size={13} color={active ? '#fff' : c.color} />
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {c.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Meal */}
            <Text style={styles.label}>Meal preference</Text>
            <View style={styles.chipGrid}>
              {MEALS.map((m) => {
                const active = meal === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMeal(m.key)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: m.color, borderColor: m.color },
                    ]}
                  >
                    <Feather name={m.icon} size={13} color={active ? '#fff' : m.color} />
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {m.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* RSVP */}
            <Text style={styles.label}>RSVP status</Text>
            <View style={styles.chipGrid}>
              {RSVP_OPTIONS.map((r) => {
                const active = rsvp === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRsvp(r.key)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: r.color, borderColor: r.color },
                    ]}
                  >
                    <Feather name={r.icon} size={13} color={active ? '#fff' : r.color} />
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes (optional)</Text>
            <View style={styles.inputWrap}>
              <Feather name="edit-3" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Dietary needs, plus-one name, etc."
                placeholderTextColor={COLORS.textLight}
                maxLength={120}
              />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Bottom bar with Cancel + Save */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !name.trim()}
              style={[
                styles.saveBtn,
                (saving || !name.trim()) && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="user-plus" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Add Guest</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingRight: 12,
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg },

  eventPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, marginBottom: SPACING.lg,
  },
  eventPillText: {
    fontSize: 13, fontWeight: '700',
    color: COLORS.primary, maxWidth: 240,
  },

  label: {
    fontSize: 12, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: SPACING.md, marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 50,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  row: { flexDirection: 'row' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4, borderLeftColor: COLORS.danger,
    padding: SPACING.md, borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, fontWeight: '600' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cancelBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
    borderRadius: RADIUS.md, backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});