// src/AddTaskModal.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { addAssignment, TASK_STATUS, PRIORITIES } from './teamService';
import { COLORS, SPACING, RADIUS } from './colors';

export default function AddTaskModal({
  visible, onClose, eventId, eventName, member, onAdded,
}) {
  const [task, setTask] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setTask('');
    setStatus('todo');
    setPriority('Medium');
    setDueDate('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError('');
    if (!task.trim()) {
      setError('Task description is required');
      return;
    }
    if (!eventId || !member?.id) {
      setError('Event and member are required');
      return;
    }

    setSaving(true);
    const res = await addAssignment({
      event_id: eventId,
      member_id: member.id,
      task,
      status,
      priority,
      due_date: dueDate || null,
    });
    setSaving(false);

    if (!res.ok) {
      setError(res.error || 'Could not save task');
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
            <Text style={styles.topTitle}>Assign Task</Text>
            <View style={{ width: 70 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {member ? (
              <View style={styles.assigneeCard}>
                <View
                  style={[
                    styles.assigneeAvatar,
                    { backgroundColor: member.avatar_color },
                  ]}
                >
                  <Text style={styles.assigneeAvatarText}>
                    {(member.name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assigneeLabel}>Assigning to</Text>
                  <Text style={styles.assigneeName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {eventName ? (
                    <Text style={styles.assigneeEvent} numberOfLines={1}>
                      {eventName}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            <Text style={styles.label}>Task description *</Text>
            <View style={[styles.inputWrap, styles.inputWrapMulti]}>
              <Feather
                name="edit-3"
                size={16}
                color={COLORS.textMuted}
                style={{ marginTop: 2 }}
              />
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={task}
                onChangeText={setTask}
                placeholder="e.g. Confirm venue booking with deposit"
                placeholderTextColor={COLORS.textLight}
                multiline
                maxLength={200}
                autoFocus
              />
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipGrid}>
              {PRIORITIES.map((p) => {
                const active = priority === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPriority(p.key)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: p.color, borderColor: p.color },
                    ]}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: active ? '#fff' : p.color },
                      ]}
                    />
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {p.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Status</Text>
            <View style={styles.chipGrid}>
              {TASK_STATUS.map((s) => {
                const active = status === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setStatus(s.key)}
                    style={[
                      styles.chip,
                      active && { backgroundColor: s.color, borderColor: s.color },
                    ]}
                  >
                    <Feather
                      name={s.icon}
                      size={13}
                      color={active ? '#fff' : s.color}
                    />
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Due date (optional)</Text>
            <View style={styles.inputWrap}>
              <Feather name="calendar" size={16} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numbers-and-punctuation"
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
              disabled={saving || !task.trim()}
              style={[
                styles.saveBtn,
                (saving || !task.trim()) && { opacity: 0.5 },
              ]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Assign Task</Text>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  scroll: { padding: SPACING.lg },

  assigneeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  assigneeAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  assigneeAvatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  assigneeLabel: {
    fontSize: 11, fontWeight: '800',
    color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  assigneeName: {
    fontSize: 15, fontWeight: '800',
    color: COLORS.text, marginTop: 2,
  },
  assigneeEvent: {
    fontSize: 12, color: COLORS.textMuted, marginTop: 2,
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
  inputWrapMulti: { height: 90, alignItems: 'flex-start', paddingTop: 14 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  inputMulti: { height: 70, textAlignVertical: 'top' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4, borderLeftColor: COLORS.danger,
    padding: SPACING.md, borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  errorText: {
    flex: 1, color: COLORS.danger,
    fontSize: 13, fontWeight: '600',
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});