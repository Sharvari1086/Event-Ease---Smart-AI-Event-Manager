// src/EventSuccessScreen.js
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from './colors';
import { getEventPlan } from './aiService';

export default function EventSuccessScreen({ navigation, route }) {
  const event = route.params?.event || { name: 'Your event' };

  const scale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const [planStatus, setPlanStatus] = useState('generating');

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Poll for plan (max 30s)
  useEffect(() => {
    if (!event.id) {
      setPlanStatus('failed');
      return;
    }

    let attempts = 0;
    let cancelled = false;

    const check = async () => {
      attempts++;
      console.log(`🔍 Polling plan (attempt ${attempts}) for event ${event.id}`);

      const res = await getEventPlan(event.id);
      if (cancelled) return;

      if (res.ok && res.data) {
        console.log('✅ Plan found!');
        setPlanStatus('ready');
        return true;
      }

      if (attempts >= 15) {
        console.log('⚠️ Plan polling timed out');
        setPlanStatus('failed');
        return true;
      }
      return false;
    };

    // Check immediately, then every 2 seconds
    check();
    const interval = setInterval(async () => {
      const done = await check();
      if (done) clearInterval(interval);
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [event.id]);

  const goToEvents = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Events' } }],
    });
  };

  const goToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
          <Feather name="check" size={56} color="#fff" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
          <Text style={styles.title}>Event created!</Text>
          <Text style={styles.subtitle}>"{event.name}" is ready to plan</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <InfoRow icon="calendar" label="Date" value={event.event_date || 'Not set'} />
          <InfoRow
            icon="users"
            label="Guests"
            value={`${event.expected_guests || 0} expected`}
          />
          <InfoRow
            icon="dollar-sign"
            label="Budget"
            value={
              event.total_budget
                ? `₹${Number(event.total_budget).toLocaleString('en-IN')}`
                : 'Not set'
            }
          />
        </Animated.View>

        <View style={styles.planBadge}>
          {planStatus === 'generating' && (
            <>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.planBadgeText}>Generating your AI plan…</Text>
            </>
          )}
          {planStatus === 'ready' && (
            <>
              <Feather name="check-circle" size={18} color={COLORS.success} />
              <Text style={[styles.planBadgeText, { color: COLORS.success }]}>
                AI plan is ready!
              </Text>
            </>
          )}
          {planStatus === 'failed' && (
            <>
              <Feather name="alert-circle" size={18} color={COLORS.warning} />
              <Text style={[styles.planBadgeText, { color: COLORS.warning }]}>
                Plan could not be generated
              </Text>
            </>
          )}
        </View>

        <Animated.View style={[styles.actions, { opacity: fadeIn }]}>
          <TouchableOpacity style={styles.primaryBtn} onPress={goToEvents}>
            <Feather name="arrow-right" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>View My Events</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={goToHome}>
            <Feather name="home" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon} size={16} color={COLORS.primary} />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl,
  },
  checkCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: COLORS.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl,
    shadowColor: COLORS.success,
    shadowOpacity: 0.4, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: {
    fontSize: 15, color: COLORS.textMuted, textAlign: 'center',
    marginTop: SPACING.sm, marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg,
  },
  card: {
    width: '100%', maxWidth: 460,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  infoLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600', flex: 1 },
  infoValue: {
    fontSize: 15, color: COLORS.text, fontWeight: '700',
    textAlign: 'right', flex: 1,
  },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  planBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  actions: { width: '100%', maxWidth: 460, gap: SPACING.md },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: RADIUS.md,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card, paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
});