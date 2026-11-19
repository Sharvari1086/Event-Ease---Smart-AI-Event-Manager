// src/HomeScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getEvents, daysUntil, formatDate, computeStats } from './eventsService';
import { getGuests } from './guestsService';
import NotificationsModal from './NotificationsModal';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, RADIUS } from './colors';
import { getNotifications, syncNotifications, requestNotificationPermissions } from './notificationService';

// ─── Event type styling ─────────────────────────────────
const TYPE_STYLES = {
  Wedding:        { icon: 'heart',     color: '#ec4899', bg: '#fdf2f8' },
  Birthday:       { icon: 'gift',      color: '#f59e0b', bg: '#fffbeb' },
  Corporate:      { icon: 'briefcase', color: '#3b82f6', bg: '#eff6ff' },
  'College Fest': { icon: 'award',     color: '#8b5cf6', bg: '#f5f3ff' },
  Workshop:       { icon: 'tool',      color: '#10b981', bg: '#ecfdf5' },
  Conference:     { icon: 'mic',       color: '#6366f1', bg: '#eef2ff' },
  Cultural:       { icon: 'music',     color: '#ef4444', bg: '#fef2f2' },
  Community:      { icon: 'users',     color: '#14b8a6', bg: '#f0fdfa' },
  default:        { icon: 'calendar',  color: '#4f46e5', bg: '#eef2ff' },
};

// ─── Home Screen ────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const loadData = async () => {
    const [evRes, gRes] = await Promise.all([getEvents(), getGuests()]);
    if (evRes.ok) setEvents(evRes.data);
    if (gRes.ok) setGuests(gRes.data);
    setLoading(false);
  };

  const loadNotifs = async () => {
    const res = await getNotifications();
    if (res.ok) setNotifications(res.data);
  };

    useFocusEffect(
    useCallback(() => {
      // Ask for permission to show push notifications
      requestNotificationPermissions().then((granted) => {
        if (granted) console.log('✅ Notification permissions granted');
      });

      loadData();
      loadNotifs();
      syncNotifications().then(() => loadNotifs());
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadNotifs()]);
    setRefreshing(false);
  };

  const upcoming = events
    .filter((e) => {
      const d = daysUntil(e.event_date);
      return d !== null && d >= 0 && e.status !== 'completed';
    })
    .sort((a, b) => daysUntil(a.event_date) - daysUntil(b.event_date));

  const activeEvent = upcoming[0];
  const stats = computeStats(events);
  const confirmedGuests = guests.filter((g) => g.rsvp === 'yes').length;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName =
    user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.fixedHeader}>
          <View style={styles.fixedHeaderContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {greeting}, {firstName} 👋
              </Text>
              <Text style={styles.subtitle}>Loading…</Text>
            </View>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ═══ FIXED PURPLE HEADER ═══ */}
      <View style={styles.fixedHeader}>
        <View style={[styles.headerCircle, styles.headerCircle1]} />
        <View style={[styles.headerCircle, styles.headerCircle2]} />
        <View style={[styles.headerCircle, styles.headerCircle3]} />

        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={styles.fixedHeaderContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {greeting}, {firstName} 👋
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {events.length === 0
                  ? 'Ready to plan your first event?'
                  : `${stats.upcoming} upcoming · ${confirmedGuests} guests confirmed`}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => setShowNotifs(true)}
                activeOpacity={0.85}
              >
                <Feather name="bell" size={22} color="#fff" />
                {unreadCount > 0 && <View style={styles.notifBadge} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatar}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.85}
              >
                <Text style={styles.avatarText}>
                  {(user?.name?.[0] || 'U').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.headerBottomCurve} />
      </View>

      {/* ═══ SCROLLING CONTENT BELOW ═══ */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        <View style={styles.headerSpacer} />

        {activeEvent ? (
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('EventOverview', { id: activeEvent.id })
            }
          >
            <View
              style={[
                styles.heroAccent,
                { backgroundColor: getStyle(activeEvent.type).color },
              ]}
            />

            <View style={styles.heroBody}>
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.heroIconWrap,
                    {
                      backgroundColor: `${getStyle(activeEvent.type).color}20`,
                    },
                  ]}
                >
                  <Feather
                    name={getStyle(activeEvent.type).icon}
                    size={22}
                    color={getStyle(activeEvent.type).color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>Next up</Text>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {activeEvent.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.heroArrow,
                    {
                      backgroundColor: `${getStyle(activeEvent.type).color}15`,
                    },
                  ]}
                >
                  <Feather
                    name="arrow-right"
                    size={18}
                    color={getStyle(activeEvent.type).color}
                  />
                </View>
              </View>

              <View style={styles.countdownBadge}>
                <Feather name="clock" size={12} color="#fff" />
                <Text style={styles.countdownText}>
                  {daysUntil(activeEvent.event_date)} days left
                </Text>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <View style={styles.heroStatIcon}>
                    <Feather name="users" size={13} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.heroStatValue}>
                      {activeEvent.expected_guests || 0}
                    </Text>
                    <Text style={styles.heroStatLabel}>guests</Text>
                  </View>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <View style={styles.heroStatIcon}>
                    <Feather
                      name="dollar-sign"
                      size={13}
                      color={COLORS.warning}
                    />
                  </View>
                  <View>
                    <Text style={styles.heroStatValue}>
                      ₹{formatK(activeEvent.total_budget)}
                    </Text>
                    <Text style={styles.heroStatLabel}>budget</Text>
                  </View>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <View style={styles.heroStatIcon}>
                    <Feather name="check-circle" size={13} color="#10b981" />
                  </View>
                  <View>
                    <Text style={styles.heroStatValue}>
                      {activeEvent.progress || 0}%
                    </Text>
                    <Text style={styles.heroStatLabel}>planned</Text>
                  </View>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${activeEvent.progress || 0}%`,
                      backgroundColor: getStyle(activeEvent.type).color,
                    },
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.emptyHero}
            onPress={() => navigation.navigate('CreateEvent')}
            activeOpacity={0.9}
          >
            <View style={styles.emptyHeroIcon}>
              <Feather name="plus" size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyHeroTitle}>No events yet</Text>
            <Text style={styles.emptyHeroSub}>
              Tap to plan your first event — takes less than a minute
            </Text>
          </TouchableOpacity>
        )}

        {events.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your overview</Text>
            <View style={styles.grid}>
              <KPICard
                icon="calendar"
                label="Total events"
                value={stats.totalEvents}
                color={COLORS.primary}
              />
              <KPICard
                icon="users"
                label="Guests"
                value={stats.totalGuests}
                color={COLORS.success}
              />
              <KPICard
                icon="dollar-sign"
                label="Budget"
                value={`₹${formatK(stats.totalBudget)}`}
                color={COLORS.warning}
              />
              <KPICard
                icon="zap"
                label="Upcoming"
                value={stats.upcoming}
                color={COLORS.danger}
              />
            </View>
          </>
        )}

        {events.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Your events</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Events')}>
                <View style={styles.seeAllWrap}>
                  <Text style={styles.seeAll}>See all</Text>
                  <Feather
                    name="arrow-right"
                    size={14}
                    color={COLORS.primary}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {events.slice(0, 3).map((event) => (
              <CompactEventRow
                key={event.id}
                event={event}
                onPress={() =>
                  navigation.navigate('EventOverview', { id: event.id })
                }
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="plus-circle"
            label="New event"
            color={COLORS.primary}
            onPress={() => navigation.navigate('CreateEvent')}
          />
          <QuickAction
            icon="users"
            label="Guests"
            color={COLORS.success}
            onPress={() => navigation.navigate('Guests')}
          />
          <QuickAction
            icon="dollar-sign"
            label="Budget"
            color={COLORS.warning}
            onPress={() => navigation.navigate('Budget')}
          />
          <QuickAction
            icon="cpu"
            label="Ask AI"
            color="#8b5cf6"
            onPress={() => navigation.navigate('AI')}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <NotificationsModal
        visible={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        onUpdate={loadNotifs}
      />
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────
function getStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.default;
}

function formatK(amount) {
  const n = Number(amount) || 0;
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return `${n}`;
}

// ─── Sub-components ─────────────────────────────────────
function KPICard({ icon, label, value, color }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}20` }]}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <View style={[styles.kpiDot, { backgroundColor: color }]} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function CompactEventRow({ event, onPress }) {
  const style = getStyle(event.type);
  const days = daysUntil(event.event_date);

  return (
    <TouchableOpacity
      style={styles.compactCard}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View
        style={[styles.compactStrip, { backgroundColor: style.color }]}
      />

      <View style={[styles.compactIcon, { backgroundColor: style.bg }]}>
        <Feather name={style.icon} size={18} color={style.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {event.name}
        </Text>
        <View style={styles.compactMetaRow}>
          <Feather name="calendar" size={11} color={COLORS.textMuted} />
          <Text style={styles.compactSub}>
            {formatDate(event.event_date)}
          </Text>
          {days !== null && days >= 0 ? (
            <>
              <View style={styles.compactDot} />
              <Text
                style={[
                  styles.compactDays,
                  days <= 7 && { color: COLORS.danger },
                ]}
              >
                {days} days
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <View
        style={[styles.compactArrow, { backgroundColor: `${style.color}15` }]}
      >
        <Feather name="chevron-right" size={16} color={style.color} />
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickLabel}>{label}</Text>
        <Text style={styles.quickSub}>Tap to open</Text>
      </View>
      <Feather name="chevron-right" size={16} color={COLORS.textLight} />
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: '#4f46e5',
    zIndex: 100,
    overflow: 'hidden',
  },
  fixedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flex: 1,
  },
  headerCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  headerCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -60,
    backgroundColor: '#6366f1',
    opacity: 0.5,
  },
  headerCircle2: {
    width: 120,
    height: 120,
    bottom: -30,
    left: -40,
    backgroundColor: '#818cf8',
    opacity: 0.4,
  },
  headerCircle3: {
    width: 70,
    height: 70,
    top: 30,
    right: 100,
    backgroundColor: '#a5b4fc',
    opacity: 0.3,
  },
  headerBottomCurve: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },

  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: '#4f46e5',
  },

  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  headerSpacer: {
    height: 170,
  },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroAccent: { height: 5, width: '100%' },
  heroBody: { padding: SPACING.lg },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  heroArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.lg,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  heroStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStatIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  heroStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },

  emptyHero: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyHeroTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptyHeroSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  seeAllWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },

  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 4,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    position: 'relative',
  },
  compactStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  compactIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  compactDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textLight,
    marginHorizontal: 4,
  },
  compactDays: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
  },
  compactArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
});