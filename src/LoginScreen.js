// src/LoginScreen.js
import { useState, useRef, useEffect } from 'react';
import {
  Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, View, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Input from './Input';
import PrimaryButton from './PrimaryButton';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, RADIUS } from './colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Entrance animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validate = () => {
    const e = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setErrors({ password: result.error || 'Login failed' });
    }
  };

  return (
    <View style={styles.root}>
      {/* Hero background */}
      <View style={styles.heroBg}>
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
        <View style={[styles.circle, styles.circle4]} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand hero */}
            <Animated.View
              style={[
                styles.brandWrap,
                {
                  opacity: fadeIn,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              <View style={styles.logoWrap}>
                <View style={styles.logoRing}>
                  <View style={styles.logo}>
                    <Feather name="calendar" size={32} color={COLORS.primary} />
                  </View>
                </View>
                <View style={styles.logoSparkle}>
                  <Feather name="zap" size={14} color="#fbbf24" />
                </View>
              </View>

              <Text style={styles.brand}>EventEase</Text>
              <Text style={styles.tagline}>Plan smarter. Celebrate better.</Text>
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: fadeIn,
                  transform: [{ translateY: slideUp }],
                },
              ]}
            >
              <Text style={styles.heading}>Welcome back 👋</Text>
              <Text style={styles.subheading}>
                Log in to continue planning
              </Text>

              <Input
                label="Email"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
              />

              <View style={styles.rowBetween}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRemember((r) => !r)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.checkbox, remember && styles.checkboxOn]}
                  >
                    {remember && (
                      <Feather name="check" size={12} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.link}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton
                title="Log In"
                onPress={onSubmit}
                loading={loading}
              />

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialBtn}
                  activeOpacity={0.85}
                  onPress={() => alert('Google sign-in coming soon')}
                >
                  <View style={styles.socialIconGoogle}>
                    <Text style={styles.socialLetter}>G</Text>
                  </View>
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialBtn}
                  activeOpacity={0.85}
                  onPress={() => alert('Apple sign-in coming soon')}
                >
                  <Feather
                    name="smartphone"
                    size={16}
                    color={COLORS.text}
                  />
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Bottom register link */}
            <Animated.View style={[styles.bottomRow, { opacity: fadeIn }]}>
              <Text style={styles.bottomText}>New to EventEase?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkBold}> Create account</Text>
              </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1 },

  // Hero background
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: '#4f46e5',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },

  // Decorative circles
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 240,
    height: 240,
    top: -80,
    right: -70,
    backgroundColor: '#6366f1',
    opacity: 0.6,
  },
  circle2: {
    width: 160,
    height: 160,
    top: 130,
    left: -60,
    backgroundColor: '#818cf8',
    opacity: 0.5,
  },
  circle3: {
    width: 90,
    height: 90,
    top: 240,
    right: 30,
    backgroundColor: '#a5b4fc',
    opacity: 0.5,
  },
  circle4: {
    width: 60,
    height: 60,
    top: 60,
    left: 40,
    backgroundColor: '#c7d2fe',
    opacity: 0.4,
  },

  scroll: {
    padding: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Brand
  brandWrap: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  logoWrap: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  logoRing: {
    padding: 6,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logoSparkle: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl,
    marginTop: 4,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rememberText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  link: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginHorizontal: 12,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  socialIconGoogle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLetter: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
  },
  socialText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Bottom
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  bottomText: { color: COLORS.textMuted, fontSize: 14 },
  linkBold: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});