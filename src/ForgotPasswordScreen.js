// src/ForgotPasswordScreen.js
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Input from './Input';
import PrimaryButton from './PrimaryButton';
import { COLORS, SPACING } from './colors';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const onSend = () => {
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Enter a valid email');
    setError('');
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>

        {!sent ? (
          <>
            <Text style={styles.heading}>Forgot password?</Text>
            <Text style={styles.subheading}>
              Enter your email and we'll send a reset link.
            </Text>
            <Input label="Email" icon="mail"
              value={email} onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address" error={error} />
            <PrimaryButton title="Send Reset Link" onPress={onSend} />
          </>
        ) : (
          <View style={styles.successWrap}>
            <View style={styles.successIcon}>
              <Feather name="check" size={32} color="#fff" />
            </View>
            <Text style={styles.heading}>Check your inbox</Text>
            <Text style={styles.subheading}>
              We've sent a password reset link to {email}
            </Text>
            <PrimaryButton title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: SPACING.xl, alignSelf: 'stretch' }} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  wrap: { padding: SPACING.xl, flex: 1 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subheading: { fontSize: 14, color: COLORS.textMuted, marginTop: 6, marginBottom: SPACING.xl },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
});