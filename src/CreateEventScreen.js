// src/CreateEventScreen.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  TextInput, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createEvent } from './eventsService';
import { generateEventPlan, saveEventPlan } from './aiService';
import { COLORS, SPACING, RADIUS } from './colors';

// ──── Config ────────────────────────────────────────────
const EVENT_TYPES = [
  { key: 'Wedding',      icon: 'heart',     color: '#ec4899', bg: '#fdf2f8' },
  { key: 'Birthday',     icon: 'gift',      color: '#f59e0b', bg: '#fffbeb' },
  { key: 'Corporate',    icon: 'briefcase', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'College Fest', icon: 'award',     color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'Workshop',     icon: 'tool',      color: '#10b981', bg: '#ecfdf5' },
  { key: 'Conference',   icon: 'mic',       color: '#6366f1', bg: '#eef2ff' },
  { key: 'Cultural',     icon: 'music',     color: '#ef4444', bg: '#fef2f2' },
  { key: 'Community',    icon: 'users',     color: '#14b8a6', bg: '#f0fdfa' },
];

const STEPS = [
  { key: 'type',    label: 'Event Type', icon: 'grid' },
  { key: 'basics',  label: 'Basic Info', icon: 'edit-3' },
  { key: 'when',    label: 'Date & Time', icon: 'calendar' },
  { key: 'where',   label: 'Venue',      icon: 'map-pin' },
  { key: 'people',  label: 'Guests',     icon: 'users' },
  { key: 'budget',  label: 'Budget',     icon: 'dollar-sign' },
  { key: 'review',  label: 'Review',     icon: 'check-circle' },
];

const REQUIREMENTS = [
  { key: 'Catering',       icon: 'coffee' },
  { key: 'Decoration',     icon: 'star' },
  { key: 'Photography',    icon: 'camera' },
  { key: 'Entertainment',  icon: 'music' },
  { key: 'Transportation', icon: 'truck' },
];

const DATE_PRESETS = [
  { label: 'Next month',  months: 1 },
  { label: 'In 3 months', months: 3 },
  { label: 'In 6 months', months: 6 },
  { label: 'In 1 year',   months: 12 },
];

const GUEST_PRESETS = [
  { label: 'Intimate',  value: 30,   icon: 'user',  hint: '~30 guests' },
  { label: 'Medium',    value: 100,  icon: 'users', hint: '~100 guests' },
  { label: 'Big',       value: 300,  icon: 'users', hint: '~300 guests' },
  { label: 'Huge',      value: 1000, icon: 'globe', hint: '1000+ guests' },
];

const BUDGET_PRESETS = [
  { label: '₹50K',  value: 50000,   tier: 'Simple' },
  { label: '₹1L',   value: 100000,  tier: 'Standard' },
  { label: '₹5L',   value: 500000,  tier: 'Premium' },
  { label: '₹15L',  value: 1500000, tier: 'Luxury' },
];

// Format helpers
const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date';

const fmtTime = (d) =>
  d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pick a time';

const toISODate = (d) => (d ? d.toISOString().split('T')[0] : null);

// ──── Main ──────────────────────────────────────────────
export default function CreateEventScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: '',
    description: '',
    dateObj: null,
    startObj: null,
    endObj: null,
    venue_name: '',
    venue_address: '',
    venue_indoor: true,
    expected_guests: '',
    total_budget: '',
    requirements: [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleReq = (r) =>
    set(
      'requirements',
      form.requirements.includes(r)
        ? form.requirements.filter(x => x !== r)
        : [...form.requirements, r]
    );

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const canProceed = () => {
    if (step === 0) return !!form.type;
    if (step === 1) return form.name.trim().length > 0;
    return true;
  };

  const applyDatePreset = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    set('dateObj', d);
  };
const onSubmit = async () => {
  setErrorMsg('');

  if (!form.name.trim()) {
    setErrorMsg('Event name is required');
    setStep(1);
    return;
  }

  setSaving(true);

  const payload = {
    name: form.name.trim(),
    type: form.type,
    description: form.description.trim(),
    event_date: toISODate(form.dateObj),
    start_time: form.startObj ? form.startObj.toTimeString().slice(0, 5) : null,
    end_time: form.endObj ? form.endObj.toTimeString().slice(0, 5) : null,
    venue_name: form.venue_name.trim(),
    venue_address: form.venue_address.trim(),
    venue_indoor: form.venue_indoor,
    expected_guests: parseInt(form.expected_guests) || 0,
    total_budget: parseFloat(form.total_budget) || 0,
    requirements: form.requirements,
    status: 'upcoming',
    progress: 0,
  };

  console.log('🚀 Creating event:', payload);

  const result = await createEvent(payload);
  console.log('📦 createEvent result:', result);

  if (!result.ok) {
    setSaving(false);
    setErrorMsg(result.error || 'Could not create event.');
    return;
  }

  const newEvent = result.data;
  console.log('✅ Event created:', newEvent.id);

  // Navigate immediately
  navigation.replace('EventSuccess', { event: newEvent });

  // Fire AI plan generation in background
  console.log('🚀 Firing plan generation...');
  try {
    const aiRes = await generateEventPlan(newEvent);
    console.log('📦 generateEventPlan:', aiRes);

    if (aiRes.ok) {
      const saveRes = await saveEventPlan(newEvent.id, aiRes.plan);
      console.log('💾 saveEventPlan:', saveRes);

      if (!saveRes.ok) {
        console.error('❌ Save failed:', saveRes.error);
      } else {
        console.log('✅ Plan saved!');
      }
    } else {
      console.error('❌ Plan gen failed:', aiRes.error);
    }
  } catch (e) {
    console.error('❌ Plan error:', e);
  }
};
  const selectedType = EVENT_TYPES.find(t => t.key === form.type);
  const accent = selectedType?.color || COLORS.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, isWide && styles.containerWide]}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Feather name="x" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.stepHeader}>
              <Feather name={STEPS[step].icon} size={15} color={accent} />
              <Text style={styles.topTitle}>{STEPS[step].label}</Text>
            </View>
            <Text style={styles.stepCount}>
              {step + 1}/{STEPS.length}
            </Text>
          </View>

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((step + 1) / STEPS.length) * 100}%`,
                  backgroundColor: accent,
                },
              ]}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {step === 0 && <StepType form={form} set={set} isWide={isWide} />}
            {step === 1 && <StepBasics form={form} set={set} accent={accent} />}
            {step === 2 && (
              <StepWhen
                form={form}
                set={set}
                applyDatePreset={applyDatePreset}
                accent={accent}
                isWide={isWide}
              />
            )}
            {step === 3 && <StepWhere form={form} set={set} accent={accent} />}
            {step === 4 && <StepWho form={form} set={set} accent={accent} isWide={isWide} />}
            {step === 5 && (
              <StepBudget
                form={form}
                set={set}
                toggleReq={toggleReq}
                accent={accent}
                isWide={isWide}
              />
            )}
            {step === 6 && <StepReview form={form} accent={accent} />}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Bottom nav */}
          <View style={styles.bottomNav}>
            {step > 0 ? (
              <TouchableOpacity onPress={back} style={styles.backBtn}>
                <Feather name="arrow-left" size={18} color={COLORS.text} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}

            {step < STEPS.length - 1 ? (
              <TouchableOpacity
                onPress={next}
                disabled={!canProceed()}
                style={[
                  styles.nextBtn,
                  { backgroundColor: accent },
                  !canProceed() && { opacity: 0.4 },
                ]}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onSubmit}
                disabled={saving}
                style={[
                  styles.nextBtn,
                  { backgroundColor: accent },
                  saving && { opacity: 0.6 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.nextBtnText}>Create Event</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──── STEP 0: Event Type ────────────────────────────────
function StepType({ form, set, isWide }) {
  return (
    <View>
      <Text style={styles.bigTitle}>What are you planning?</Text>
      <Text style={styles.subtitle}>
        Pick a type — we'll tailor the experience for you
      </Text>

      <View style={styles.typeGrid}>
        {EVENT_TYPES.map(t => {
          const active = form.type === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => set('type', t.key)}
              style={[
                styles.typeCard,
                isWide && styles.typeCardWide,
                { backgroundColor: t.bg },
                active && { borderColor: t.color, borderWidth: 2 },
              ]}
            >
              <View style={[styles.typeIconWrap, { backgroundColor: t.color }]}>
                <Feather name={t.icon} size={22} color="#fff" />
              </View>
              <Text style={[styles.typeLabel, active && { color: t.color }]}>
                {t.key}
              </Text>
              {active && (
                <View style={[styles.typeCheck, { backgroundColor: t.color }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ──── STEP 1: Basic Info ────────────────────────────────
function StepBasics({ form, set, accent }) {
  return (
    <View>
      <Text style={styles.bigTitle}>Give it a name</Text>
      <Text style={styles.subtitle}>Something memorable for your event</Text>

      <Input
        icon="edit-3"
        label="Event name *"
        value={form.name}
        onChangeText={v => set('name', v)}
        placeholder="e.g. Ananya & Rohan Wedding"
        autoCapitalize="words"
      />

      <Input
        icon="file-text"
        label="Description (optional)"
        value={form.description}
        onChangeText={v => set('description', v)}
        placeholder="A short note about your event"
        autoCapitalize="sentences"
        multiline
      />

      <View style={[styles.tipBox, { borderLeftColor: accent }]}>
        <Feather name="info" size={16} color={accent} />
        <Text style={styles.tipText}>
          You can create multiple events. Each has its own guests, budget, and tasks.
        </Text>
      </View>
    </View>
  );
}

// ──── STEP 2: Date & Time ───────────────────────────────
function StepWhen({ form, set, applyDatePreset, accent, isWide }) {
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  return (
    <View>
      <Text style={styles.bigTitle}>When is it?</Text>
      <Text style={styles.subtitle}>Pick a date or use a quick preset</Text>

      <View style={styles.presetRow}>
        {DATE_PRESETS.map(p => (
          <TouchableOpacity
            key={p.label}
            onPress={() => applyDatePreset(p.months)}
            style={styles.presetChip}
          >
            <Text style={styles.presetText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Event date</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setShowDate(true)}
      >
        <Feather name="calendar" size={18} color={COLORS.primary} />
        <Text style={styles.pickerText}>{fmtDate(form.dateObj)}</Text>
        <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
      {showDate && (
        <DateTimePicker
          value={form.dateObj || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(e, d) => {
            setShowDate(Platform.OS === 'ios');
            if (d) set('dateObj', d);
          }}
        />
      )}
      {Platform.OS === 'ios' && showDate && (
        <TouchableOpacity
          style={styles.pickerDone}
          onPress={() => setShowDate(false)}
        >
          <Text style={styles.pickerDoneText}>Done</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.twoCol, !isWide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Start time</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowStart(true)}
          >
            <Feather name="clock" size={18} color={COLORS.primary} />
            <Text style={styles.pickerText}>{fmtTime(form.startObj)}</Text>
            <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showStart && (
            <DateTimePicker
              value={form.startObj || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setShowStart(Platform.OS === 'ios');
                if (d) set('startObj', d);
              }}
            />
          )}
          {Platform.OS === 'ios' && showStart && (
            <TouchableOpacity
              style={styles.pickerDone}
              onPress={() => setShowStart(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {isWide && <View style={{ width: 12 }} />}

        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>End time</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowEnd(true)}
          >
            <Feather name="clock" size={18} color={COLORS.primary} />
            <Text style={styles.pickerText}>{fmtTime(form.endObj)}</Text>
            <Feather name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          {showEnd && (
            <DateTimePicker
              value={form.endObj || new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, d) => {
                setShowEnd(Platform.OS === 'ios');
                if (d) set('endObj', d);
              }}
            />
          )}
          {Platform.OS === 'ios' && showEnd && (
            <TouchableOpacity
              style={styles.pickerDone}
              onPress={() => setShowEnd(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

// ──── STEP 3: Venue ─────────────────────────────────────
function StepWhere({ form, set }) {
  return (
    <View>
      <Text style={styles.bigTitle}>Where will it happen?</Text>
      <Text style={styles.subtitle}>Add the location details</Text>

      <Input
        icon="home"
        label="Venue name"
        value={form.venue_name}
        onChangeText={v => set('venue_name', v)}
        placeholder="e.g. Grand Palace, Mumbai"
        autoCapitalize="words"
      />

      <Input
        icon="map-pin"
        label="Full address"
        value={form.venue_address}
        onChangeText={v => set('venue_address', v)}
        placeholder="Street, City, Pincode"
        autoCapitalize="sentences"
        multiline
      />

      <Text style={styles.inputLabel}>Venue type</Text>
      <View style={styles.twoCol}>
        <TouchableOpacity
          onPress={() => set('venue_indoor', true)}
          style={[styles.venueBtn, form.venue_indoor && styles.venueBtnOn]}
        >
          <Feather name="home" size={18} color={form.venue_indoor ? '#fff' : COLORS.text} />
          <Text style={[styles.venueBtnText, form.venue_indoor && { color: '#fff' }]}>
            Indoor
          </Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          onPress={() => set('venue_indoor', false)}
          style={[styles.venueBtn, !form.venue_indoor && styles.venueBtnOn]}
        >
          <Feather name="sun" size={18} color={!form.venue_indoor ? '#fff' : COLORS.text} />
          <Text style={[styles.venueBtnText, !form.venue_indoor && { color: '#fff' }]}>
            Outdoor
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ──── STEP 4: Guests ────────────────────────────────────
function StepWho({ form, set, accent, isWide }) {
  return (
    <View>
      <Text style={styles.bigTitle}>How many guests?</Text>
      <Text style={styles.subtitle}>Estimate — you can adjust later</Text>

      <View style={styles.guestGrid}>
        {GUEST_PRESETS.map(g => {
          const active = parseInt(form.expected_guests) === g.value;
          return (
            <TouchableOpacity
              key={g.label}
              onPress={() => set('expected_guests', String(g.value))}
              style={[
                styles.guestCard,
                isWide && styles.guestCardWide,
                active && { borderColor: accent },
              ]}
            >
              <Feather name={g.icon} size={24} color={active ? accent : COLORS.textMuted} />
              <Text style={[styles.guestLabel, active && { color: accent }]}>
                {g.label}
              </Text>
              <Text style={styles.guestHint}>{g.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        icon="users"
        label="Or enter exact number"
        value={form.expected_guests}
        onChangeText={v => set('expected_guests', v.replace(/\D/g, ''))}
        placeholder="e.g. 150"
        keyboardType="number-pad"
      />
    </View>
  );
}

// ──── STEP 5: Budget + Requirements ─────────────────────
function StepBudget({ form, set, toggleReq, accent, isWide }) {
  return (
    <View>
      <Text style={styles.bigTitle}>Set your budget</Text>
      <Text style={styles.subtitle}>We'll help you stay on track</Text>

      <View style={styles.budgetGrid}>
        {BUDGET_PRESETS.map(b => {
          const active = parseFloat(form.total_budget) === b.value;
          return (
            <TouchableOpacity
              key={b.label}
              onPress={() => set('total_budget', String(b.value))}
              style={[
                styles.budgetCard,
                isWide && styles.budgetCardWide,
                active && { borderColor: accent },
              ]}
            >
              <Text style={[styles.budgetAmount, active && { color: accent }]}>
                {b.label}
              </Text>
              <Text style={styles.budgetTier}>{b.tier}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        icon="dollar-sign"
        label="Or enter custom budget (₹)"
        value={form.total_budget}
        onChangeText={v => set('total_budget', v.replace(/\D/g, ''))}
        placeholder="e.g. 200000"
        keyboardType="number-pad"
      />

      <Text style={styles.inputLabel}>What do you need?</Text>
      <View style={styles.reqGrid}>
        {REQUIREMENTS.map(r => {
          const active = form.requirements.includes(r.key);
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => toggleReq(r.key)}
              style={[styles.reqChip, active && { backgroundColor: accent, borderColor: accent }]}
            >
              <Feather name={r.icon} size={15} color={active ? '#fff' : COLORS.text} />
              <Text style={[styles.reqText, active && { color: '#fff' }]}>{r.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ──── STEP 6: Review ────────────────────────────────────
function StepReview({ form, accent }) {
  return (
    <View>
      <Text style={styles.bigTitle}>Looking good!</Text>
      <Text style={styles.subtitle}>Review and create</Text>

      <View style={[styles.reviewCard, { borderTopColor: accent }]}>
        <Text style={[styles.reviewName, { color: accent }]}>
          {form.name || 'Untitled Event'}
        </Text>
        <Text style={styles.reviewType}>{form.type}</Text>

        <View style={styles.reviewDivider} />

        <ReviewRow icon="calendar" label="Date" value={fmtDate(form.dateObj)} />
        <ReviewRow
          icon="clock"
          label="Time"
          value={
            form.startObj && form.endObj
              ? `${fmtTime(form.startObj)} – ${fmtTime(form.endObj)}`
              : form.startObj
              ? fmtTime(form.startObj)
              : 'Not set'
          }
        />
        <ReviewRow icon="map-pin" label="Venue" value={form.venue_name || 'Not set'} />
        <ReviewRow
          icon="home"
          label="Setting"
          value={form.venue_indoor ? 'Indoor' : 'Outdoor'}
        />
        <ReviewRow
          icon="users"
          label="Guests"
          value={form.expected_guests ? `${form.expected_guests} guests` : 'Not set'}
        />
        <ReviewRow
          icon="dollar-sign"
          label="Budget"
          value={
            form.total_budget
              ? `₹${Number(form.total_budget).toLocaleString('en-IN')}`
              : 'Not set'
          }
        />
        {form.requirements.length > 0 && (
          <ReviewRow
            icon="check-square"
            label="Needs"
            value={form.requirements.join(', ')}
          />
        )}
      </View>

      <View style={[styles.tipBox, { borderLeftColor: accent }]}>
        <Feather name="zap" size={16} color={accent} />
        <Text style={styles.tipText}>
          After creating, you can add tasks, guests, vendors, and payments.
        </Text>
      </View>
    </View>
  );
}

function ReviewRow({ icon, label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Feather name={icon} size={15} color={COLORS.textMuted} style={{ width: 22 }} />
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ──── Input ─────────────────────────────────────────────
function Input({ icon, label, value, onChangeText, placeholder, keyboardType, autoCapitalize, multiline }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrap}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          focused && { borderColor: COLORS.primary },
        ]}
      >
        {icon ? (
          <Feather
            name={icon}
            size={17}
            color={focused ? COLORS.primary : COLORS.textMuted}
            style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }}
          />
        ) : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ──── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, width: '100%' },
  containerWide: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  stepCount: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  progressTrack: {
    height: 4, backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg, borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  scroll: { padding: SPACING.lg },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: COLORS.danger,
    padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.md,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, fontWeight: '600' },
  bigTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: SPACING.md },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.xl },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeCard: {
    width: '48%', borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.md, alignItems: 'center', position: 'relative',
    borderWidth: 2, borderColor: 'transparent',
  },
  typeCardWide: { width: '23%' },
  typeIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  typeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  typeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  inputWrap: { marginBottom: SPACING.lg },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 52,
  },
  inputRowMultiline: { height: 90, alignItems: 'flex-start', paddingTop: 14 },
  input: { flex: 1, fontSize: 15, color: COLORS.text },
  inputMultiline: { height: 70, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 12 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  presetChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  presetText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 52, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
  },
  pickerText: { flex: 1, fontSize: 15, color: COLORS.text },
  pickerDone: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg, paddingVertical: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  pickerDoneText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  venueBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  venueBtnOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  venueBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  guestGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: SPACING.lg,
  },
  guestCard: {
    width: '48%', padding: SPACING.lg,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.card,
    alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 2, borderColor: 'transparent', gap: 4,
  },
  guestCardWide: { width: '23%' },
  guestLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  guestHint: { fontSize: 11, color: COLORS.textMuted },
  budgetGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: SPACING.lg,
  },
  budgetCard: {
    width: '48%', padding: SPACING.lg,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.card,
    alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  budgetCardWide: { width: '23%' },
  budgetAmount: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  budgetTier: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  reqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reqChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card,
  },
  reqText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  reviewCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderTopWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  reviewName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  reviewType: {
    fontSize: 13, color: COLORS.textMuted, textAlign: 'center',
    marginTop: 4, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reviewDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg },
  reviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  reviewLabel: { fontSize: 13, color: COLORS.textMuted, width: 70, marginLeft: 8 },
  reviewValue: {
    flex: 1, fontSize: 13, fontWeight: '600',
    color: COLORS.text, textAlign: 'right',
  },
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginTop: SPACING.lg, padding: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderLeftWidth: 4,
  },
  tipText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  backText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.xl, paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});