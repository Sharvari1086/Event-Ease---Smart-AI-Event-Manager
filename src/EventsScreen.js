// src/EventsScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getEvents, deleteEvent, daysUntil, formatDate,
  computeStats, getRecommendations,
} from './eventsService';
import { COLORS, SPACING, RADIUS } from './colors';

const TYPE_COLORS = {
  Wedding:        { color: '#ec4899', bg: '#fdf2f8', icon: 'heart' },
  Birthday:       { color: '#f59e0b', bg: '#fffbeb', icon: 'gift' },
  Corporate:      { color: '#3b82f6', bg: '#eff6ff', icon: 'briefcase' },
  'College Fest': { color: '#8b5cf6', bg: '#f5f3ff', icon: 'award' },
  Workshop:       { color: '#10b981', bg: '#ecfdf5', icon: 'tool' },
  Conference:     { color: '#6366f1', bg: '#eef2ff', icon: 'mic' },
  Cultural:       { color: '#ef4444', bg: '#fef2f2', icon: 'music' },
  Community:      { color: '#14b8a6', bg: '#f0fdfa', icon: 'users' },
  default:        { color: '#4f46e5', bg: '#eef2ff', icon: 'calendar' },
};

const FILTERS = [
  { key: 'All',       icon: 'grid' },
  { key: 'Upcoming',  icon: 'clock' },
  { key: 'Completed', icon: 'check-circle' },
  { key: 'Draft',     icon: 'edit-3' },
];

export default function EventsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    const result = await getEvents();
    if (result.ok) setEvents(result.data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const confirmDelete = (event) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Delete "${event.name}"?`);
      if (ok) doDelete(event.id);
    } else {
      Alert.alert(
        'Delete event?',
        `"${event.name}" will be permanently deleted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => doDelete(event.id) },
        ]
      );
    }
  };

  const doDelete = async (id) => {
    await deleteEvent(id);
    loadEvents();
  };

  const filtered = events.filter((e) => {
    if (filter === 'All') return true;
    if (filter === 'Upcoming')
      return e.status === 'upcoming' || (daysUntil(e.event_date) ?? -1) >= 0;
    if (filter === 'Completed') return e.status === 'completed';
    if (filter === 'Draft') return e.status === 'draft';
    return true;
  });

  const stats = computeStats(events);
  const recommendations = getRecommendations(events);

  const handleRecommendation = (rec) => {
    if (rec.action === 'create') navigation.navigate('CreateEvent');
    else if (rec.action === 'edit' || rec.action === 'view')
      navigation.navigate('EventOverview', { id: rec.eventId });
    else if (rec.action === 'ai')
      navigation.navigate('MainTabs', { screen: 'AI' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>
              {events.length} {events.length === 1 ? 'event' : 'events'} total
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('CreateEvent')}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
        

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.recommendationsWrap}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.aiBadge}>
                    <Feather name="cpu" size={14} color="#fff" />
                  </View>
                  <Text style={styles.sectionTitle}>For you</Text>
                </View>
                <Text style={styles.sectionHint}>AI suggestions</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recsScroll}
              >
                {recommendations.map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={[styles.recCard, { borderLeftColor: rec.color }]}
                    onPress={() => handleRecommendation(rec)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.recIcon, { backgroundColor: `${rec.color}20` }]}>
                      <Feather name={rec.icon} size={22} color={rec.color} />
                    </View>
                    <Text style={styles.recTitle} numberOfLines={2}>
                      {rec.title}
                    </Text>
                    <Text style={styles.recSub} numberOfLines={2}>
                      {rec.subtitle}
                    </Text>
                    <View style={styles.recFooter}>
                      <Feather name="arrow-right" size={18} color={rec.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterChip, filter === f.key && styles.filterChipOn]}
                activeOpacity={0.85}
              >
                <Feather
                  name={f.icon}
                  size={16}
                  color={filter === f.key ? '#fff' : COLORS.textMuted}
                />
                <Text style={[styles.filterText, filter === f.key && { color: '#fff' }]}>
                  {f.key}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Events list */}
          {filtered.length === 0 ? (
            <EmptyState
              filter={filter}
              onCreate={() => navigation.navigate('CreateEvent')}
            />
          ) : (
            <View style={isWide ? styles.gridWide : null}>
              {filtered.map((event) => (
                <View key={event.id} style={isWide ? styles.gridItem : null}>
                  <EventCard
                    event={event}
                    onPress={() =>
                      navigation.navigate('EventOverview', { id: event.id })
                    }
                    onDelete={() => confirmDelete(event)}
                  />
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ──── Event Card ────────────────────────────────────────
function EventCard({ event, onPress, onDelete }) {
  const days = daysUntil(event.event_date);
  const isUpcoming = days !== null && days >= 0;
  const style = TYPE_COLORS[event.type] || TYPE_COLORS.default;
  const progress = event.progress || 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.cardAccent, { backgroundColor: style.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typePill, { backgroundColor: style.bg }]}>
            <Feather name={style.icon} size={14} color={style.color} />
            <Text style={[styles.typePillText, { color: style.color }]}>
              {event.type}
            </Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={12} style={styles.menuBtn}>
            <Feather name="trash-2" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {event.name}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={15} color={COLORS.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {formatDate(event.event_date)}
            </Text>
          </View>
          {event.venue_name ? (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={15} color={COLORS.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {event.venue_name}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardStats}>
          <Stat icon="users" value={event.expected_guests || 0} label="guests" />
          <Stat
            icon="dollar-sign"
            value={`₹${Math.round((event.total_budget || 0) / 1000)}K`}
            label="budget"
          />
          <Stat
            icon={isUpcoming ? 'clock' : 'flag'}
            value={isUpcoming ? days : event.status || '—'}
            label={isUpcoming ? 'days left' : 'status'}
            highlight={
              isUpcoming && days <= 7
                ? COLORS.danger
                : isUpcoming
                ? COLORS.warning
                : COLORS.textMuted
            }
          />
        </View>

        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: style.color },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress}% planned</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Stat({ icon, value, label, highlight }) {
  return (
    <View style={styles.stat}>
      <Feather name={icon} size={15} color={highlight || COLORS.textMuted} />
      <Text style={[styles.statValue, highlight && { color: highlight }]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatMini({ icon, label, value, color }) {
  return (
    <View style={styles.statMini}>
      <View style={[styles.statMiniIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statMiniValue}>{value}</Text>
      <Text style={styles.statMiniLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ filter, onCreate }) {
  const isEmpty = filter === 'All';
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={isEmpty ? 'calendar' : 'inbox'} size={40} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        {isEmpty ? 'No events yet' : `No ${filter.toLowerCase()} events`}
      </Text>
      <Text style={styles.emptySub}>
        {isEmpty
          ? 'Tap the + button to plan your first event'
          : 'Try a different filter or create a new event'}
      </Text>
      {isEmpty && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.emptyBtnText}>Create your first event</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ──── Styles (Bigger fonts, better spacing) ─────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, width: '100%' },
  containerWide: { maxWidth: 1000, alignSelf: 'center', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  title: { fontSize: 34, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, marginTop: 4 },
  addBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.xl },
  statMini: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 100,
    justifyContent: 'center',
  },
  statMiniIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statMiniValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statMiniLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },

  // Recommendations
  recommendationsWrap: { marginBottom: SPACING.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  sectionHint: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  recsScroll: { gap: 12, paddingRight: SPACING.lg, paddingVertical: 4 },
  recCard: {
    width: 250,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  recIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  recTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  recSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 19 },
  recFooter: { marginTop: SPACING.md, alignItems: 'flex-end' },

  // Filters
  filtersRow: { gap: 10, paddingBottom: SPACING.lg },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 15, color: COLORS.text, fontWeight: '700' },

  // Grid
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '48.8%' },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardAccent: { height: 6, width: '100%' },
  cardBody: { padding: SPACING.lg },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  typePillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  menuBtn: { padding: 6 },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },

  cardStats: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'space-between',
  },
  stat: { alignItems: 'center', flex: 1, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  progressWrap: { marginTop: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: {
    flex: 1, height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  emptySub: {
    fontSize: 16, color: COLORS.textMuted,
    marginTop: 6, textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});