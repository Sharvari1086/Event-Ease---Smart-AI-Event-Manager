// src/RegisterScreen.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Input from './Input';
import PrimaryButton from './PrimaryButton';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, RADIUS } from './colors';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'College Fest', 'Workshop'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '',
  });
  const [prefs, setPrefs] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const togglePref = (p) =>
    setPrefs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const strength = (() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 6) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name required';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.phone.replace(/\D/g, '').length < 10) e.phone = 'Valid phone required';
    if (form.password.length < 6) e.password = 'Minimum 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

 const onSubmit = async () => {
  if (!validate()) return;
  setLoading(true);
  const result = await register({
    name: form.name,
    email: form.email,
    phone: form.phone,
    password: form.password,
  });
  setLoading(false);
  if (!result.ok) {
    setErrors({ email: result.error || 'Registration failed' });
  }
};

  const strengthLabel = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'][strength];
  const strengthColor = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981'][strength];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.subheading}>Start planning in seconds</Text>

          <Input label="Full name" icon="user"
            value={form.name} onChangeText={set('name')}
            placeholder="Ananya Sharma" autoCapitalize="words" error={errors.name} />

          <Input label="Email" icon="mail"
            value={form.email} onChangeText={set('email')}
            placeholder="you@example.com" keyboardType="email-address" error={errors.email} />

          <Input label="Mobile number" icon="phone"
            value={form.phone} onChangeText={set('phone')}
            placeholder="+91 98200 00000" keyboardType="phone-pad" error={errors.phone} />

          <Input label="Password" icon="lock"
            value={form.password} onChangeText={set('password')}
            placeholder="••••••••" secureTextEntry error={errors.password} />

          {form.password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBar}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.strengthSeg,
                    { backgroundColor: i < strength ? strengthColor : COLORS.border }]} />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: strengthColor }]}>
                {strengthLabel}
              </Text>
            </View>
          )}

          <Input label="Confirm password" icon="lock"
            value={form.confirm} onChangeText={set('confirm')}
            placeholder="••••••••" secureTextEntry error={errors.confirm} />

          <Text style={styles.sectionLabel}>Preferred event types</Text>
          <View style={styles.chipsWrap}>
            {EVENT_TYPES.map(t => {
              const active = prefs.includes(t);
              return (
                <TouchableOpacity key={t} onPress={() => togglePref(t)}
                  style={[styles.chip, active && styles.chipOn]}>
                  <Text style={[styles.chipText, active && { color: '#fff' }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <PrimaryButton title="Create Account" onPress={onSubmit} loading={loading}
            style={{ marginTop: SPACING.xl }} />

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkBold}> Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.xl, paddingBottom: 40 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subheading: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.xl, marginTop: 4 },
  strengthWrap: { marginBottom: SPACING.lg, marginTop: -SPACING.sm },
  strengthBar: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.text,
    marginBottom: SPACING.sm, marginTop: SPACING.sm,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl },
  bottomText: { color: COLORS.textMuted, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
});