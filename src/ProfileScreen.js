// src/ProfileScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { getEvents } from './eventsService';
import { getGuests } from './guestsService';
import { getExpenses } from './budgetService';
import { COLORS, SPACING, RADIUS } from './colors';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    events: 0,
    guests: 0,
    expenses: 0,
    totalSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    const [evRes, gRes, exRes] = await Promise.all([
      getEvents(),
      getGuests(),
      getExpenses(),
    ]);
    const events = evRes.ok ? evRes.data : [];
    const guests = gRes.ok ? gRes.data : [];
    const expenses = exRes.ok ? exRes.data : [];
    const totalSpent = expenses.reduce(
      (sum, e) => sum + Number(e.amount || 0),
      0
    );
    setStats({
      events: events.length,
      guests: guests.length,
      expenses: expenses.length,
      totalSpent,
    });
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Log out of EventEase?')) doLogout();
    } else {
      Alert.alert(
        'Log out?',
        'You will need to sign in again to access your events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', style: 'destructive', onPress: doLogout },
        ]
      );
    }
  };

  const initial = (user?.name?.[0] || 'U').toUpperCase();
  const fullName = user?.name || 'User';
  const email = user?.email || '';
  const phone = user?.phone || 'Not set';

  const formatMoney = (n) => {
    const num = Number(n) || 0;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${Math.round(num / 1000)}K`;
    return `₹${num}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color={COLORS.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Profile</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{email}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Feather name="phone" size={12} color={COLORS.primary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {phone}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Feather name="calendar" size={12} color={COLORS.primary} />
              <Text style={styles.metaText}>
                Joined{' '}
                {new Date().toLocaleDateString('en-IN', {
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats overview */}
        {!loading && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionLabel}>Your activity</Text>
            <View style={styles.statsGrid}>
              <StatMini
                icon="calendar"
                label="Events"
                value={stats.events}
                color={COLORS.primary}
              />
              <StatMini
                icon="users"
                label="Guests"
                value={stats.guests}
                color={COLORS.success}
              />
              <StatMini
                icon="receipt"
                label="Expenses"
                value={stats.expenses}
                color={COLORS.warning}
              />
              <StatMini
                icon="dollar-sign"
                label="Spent"
                value={formatMoney(stats.totalSpent)}
                color={COLORS.danger}
              />
            </View>
          </View>
        )}

        {/* Settings section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="user"
            label="Edit profile"
            onPress={() =>
              Alert.alert('Coming soon', 'Profile editing will be added soon.')
            }
          />
          <Divider />
          <SettingsRow
            icon="lock"
            label="Change password"
            onPress={() =>
              Alert.alert('Coming soon', 'Password change will be added soon.')
            }
          />
          <Divider />
          <SettingsRow
            icon="bell"
            label="Notifications"
            onPress={() =>
              Alert.alert('Coming soon', 'Notification settings soon.')
            }
          />
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="moon"
            label="Appearance"
            value="Light"
            onPress={() => Alert.alert('Coming soon', 'Dark mode soon.')}
          />
          <Divider />
          <SettingsRow
            icon="shield"
            label="Privacy"
            onPress={() => Alert.alert('Coming soon', 'Privacy settings soon.')}
          />
          <Divider />
          <SettingsRow
            icon="help-circle"
            label="Help & support"
            onPress={() =>
              Alert.alert(
                'EventEase Help',
                'For support, contact: support@eventease.app'
              )
            }
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <SettingsRow
            icon="info"
            label="Version"
            value="1.0.0"
            onPress={() =>
              Alert.alert('EventEase', 'AI-Powered Smart Event Planning\nv1.0.0')
            }
          />
        </View>

        {/* Logout button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────

function StatMini({ icon, label, value, color }) {
  return (
    <View style={styles.statMini}>
      <View style={[styles.statMiniIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsIcon}>
        <Feather name={icon} size={17} color={COLORS.primary} />
      </View>
      <Text style={styles.settingsLabel}>{label}</Text>
      {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarBig: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarBigText: { fontSize: 42, fontWeight: '800', color: '#fff' },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  email: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.full,
    maxWidth: 220,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Stats
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statMini: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statMiniIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statMiniValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statMiniLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },

  // Sections
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 16,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingsValue: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginRight: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 64,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: SPACING.xl,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.danger,
  },
});