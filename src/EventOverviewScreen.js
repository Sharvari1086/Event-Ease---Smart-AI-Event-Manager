// src/EventOverviewScreen.js
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getEvent, daysUntil, formatDate } from './eventsService';
import { getEventPlan } from './aiService';
import { COLORS, SPACING, RADIUS } from './colors';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'tasks',    label: 'Tasks',    icon: 'check-square' },
  { key: 'budget',   label: 'Budget',   icon: 'dollar-sign' },
  { key: 'timeline', label: 'Timeline', icon: 'clock' },
];

export default function EventOverviewScreen({ navigation, route }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    loadData();
    // Poll for plan if it's not ready yet
    const interval = setInterval(async () => {
      const p = await getEventPlan(id);
      if (p.ok && p.data) {
        setPlan(p.data);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    const [e, p] = await Promise.all([getEvent(id), getEventPlan(id)]);
    if (e.ok) setEvent(e.data);
    if (p.ok && p.data) setPlan(p.data);
    setLoading(false);
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

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const days = daysUntil(event.event_date);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{event.type}</Text>
            </View>
            <Text style={styles.heroTitle}>{event.name}</Text>
            {event.venue_name ? (
              <Text style={styles.heroSub}>{event.venue_name}</Text>
            ) : null}

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Feather name="calendar" size={16} color={COLORS.textMuted} />
                <Text style={styles.heroStatValue}>{formatDate(event.event_date)}</Text>
              </View>
              {days !== null && days >= 0 && (
                <View style={styles.heroStat}>
                  <Feather name="clock" size={16} color={COLORS.textMuted} />
                  <Text style={styles.heroStatValue}>{days} days left</Text>
                </View>
              )}
              <View style={styles.heroStat}>
                <Feather name="users" size={16} color={COLORS.textMuted} />
                <Text style={styles.heroStatValue}>
                  {event.expected_guests || 0} guests
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Feather name="dollar-sign" size={16} color={COLORS.textMuted} />
                <Text style={styles.heroStatValue}>
                  ₹{Number(event.total_budget || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabChip, tab === t.key && styles.tabChipOn]}
                onPress={() => setTab(t.key)}
              >
                <Feather
                  name={t.icon}
                  size={15}
                  color={tab === t.key ? '#fff' : COLORS.text}
                />
                <Text
                  style={[styles.tabText, tab === t.key && { color: '#fff' }]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Content */}
          {!plan ? (
            <View style={styles.waitingBox}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.waitingText}>
                AI is generating your personalized plan…
              </Text>
            </View>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab event={event} plan={plan} />}
              {tab === 'tasks' && <TasksTab plan={plan} />}
              {tab === 'budget' && <BudgetTab plan={plan} event={event} />}
              {tab === 'timeline' && <TimelineTab plan={plan} />}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ──── Tabs ──────────────────────────────────────────────
function OverviewTab({ event, plan }) {
  return (
    <View>
      <SectionTitle icon="zap" title="AI Tips" />
      {plan.tips?.map((tip, i) => (
        <View key={i} style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}

      <SectionTitle icon="briefcase" title="Suggested Vendors" />
      <View style={styles.vendorGrid}>
        {plan.vendors_suggested?.map((v, i) => (
          <View key={i} style={styles.vendorCard}>
            <Feather name="shopping-bag" size={16} color={COLORS.primary} />
            <Text style={styles.vendorType}>{v.type}</Text>
            <Text style={styles.vendorReason} numberOfLines={2}>
              {v.reason}
            </Text>
          </View>
        ))}
      </View>

      <SectionTitle icon="info" title="Event Details" />
      <DetailRow icon="file-text" label="Description" value={event.description || '—'} />
      <DetailRow icon="map-pin" label="Address" value={event.venue_address || '—'} />
      <DetailRow icon="home" label="Setting" value={event.venue_indoor ? 'Indoor' : 'Outdoor'} />
      <DetailRow
        icon="check-square"
        label="Requirements"
        value={(event.requirements || []).join(', ') || '—'}
      />
    </View>
  );
}

function TasksTab({ plan }) {
  const grouped = (plan.tasks || []).reduce((acc, t) => {
    const p = t.priority || 'Medium';
    acc[p] = acc[p] || [];
    acc[p].push(t);
    return acc;
  }, {});

  const order = ['High', 'Medium', 'Low'];
  const colors = { High: COLORS.danger, Medium: COLORS.warning, Low: COLORS.success };

  return (
    <View>
      {order.map((p) =>
        grouped[p]?.length ? (
          <View key={p}>
            <SectionTitle icon="flag" title={`${p} Priority`} />
            {grouped[p].map((t, i) => (
              <View key={i} style={styles.taskRow}>
                <View style={[styles.taskDot, { backgroundColor: colors[p] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={styles.taskMeta}>
                    {t.category} · {t.due_offset_days} days before event
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null
      )}
    </View>
  );
}

function BudgetTab({ plan, event }) {
  return (
    <View>
      <SectionTitle icon="dollar-sign" title="Budget Breakdown" />
      {(plan.budget_breakdown || []).map((b, i) => (
        <View key={i} style={styles.budgetRow}>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetFill,
                {
                  width: `${Math.min(b.percent || 0, 100)}%`,
                  backgroundColor: COLORS.primary,
                },
              ]}
            />
          </View>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetCategory}>{b.category}</Text>
            <Text style={styles.budgetAmount}>
              ₹{Number(b.amount || 0).toLocaleString('en-IN')} ({b.percent}%)
            </Text>
          </View>
        </View>
      ))}
      <View style={styles.budgetTotal}>
        <Text style={styles.budgetTotalLabel}>Total</Text>
        <Text style={styles.budgetTotalValue}>
          ₹{Number(event.total_budget || 0).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

function TimelineTab({ plan }) {
  return (
    <View>
      <SectionTitle icon="clock" title="Planning Timeline" />
      {(plan.timeline || []).map((t, i) => (
        <View key={i} style={styles.timelineRow}>
          <View style={styles.timelineDot} />
          {i < (plan.timeline?.length || 0) - 1 && <View style={styles.timelineLine} />}
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.timelinePhase}>{t.phase}</Text>
            <Text style={styles.timelineDesc}>{t.description}</Text>
            <Text style={styles.timelineOffset}>
              {t.offset_days} days before event
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ──── Helpers ───────────────────────────────────────────
function SectionTitle({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Feather name={icon} size={16} color={COLORS.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Feather name={icon} size={16} color={COLORS.textMuted} style={{ width: 24 }} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

// ──── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, width: '100%' },
  containerWide: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: COLORS.textMuted },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '700',
    color: COLORS.text, textAlign: 'center', marginHorizontal: 12,
  },

  scroll: { padding: SPACING.lg },

  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
  },
  typePillText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  heroTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: SPACING.md,
  },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  tabsRow: { gap: 8, paddingBottom: SPACING.lg },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tabChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  waitingBox: {
    alignItems: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  waitingText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  tipRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.primary, marginTop: 8,
  },
  tipText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },

  vendorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vendorCard: {
    width: '48%', padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  vendorType: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  vendorReason: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, lineHeight: 17 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 13, color: COLORS.textMuted,
    width: 90, marginLeft: 8, fontWeight: '600',
  },
  detailValue: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },

  taskRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
    gap: 12,
  },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  taskMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },

  budgetRow: { marginBottom: SPACING.md },
  budgetBar: {
    height: 8, backgroundColor: COLORS.border,
    borderRadius: 4, overflow: 'hidden',
  },
  budgetFill: { height: '100%', borderRadius: 4 },
  budgetInfo: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 6,
  },
  budgetCategory: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  budgetAmount: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  budgetTotal: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: SPACING.md, marginTop: SPACING.md,
    borderTopWidth: 2, borderTopColor: COLORS.primary,
  },
  budgetTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  budgetTotalValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },

  timelineRow: { flexDirection: 'row', marginBottom: SPACING.lg, position: 'relative' },
  timelineDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 3, borderColor: COLORS.primarySoft,
    marginTop: 4, zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 6, top: 18, bottom: -12,
    width: 2, backgroundColor: COLORS.border,
  },
  timelinePhase: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  timelineDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 19 },
  timelineOffset: {
    fontSize: 11, color: COLORS.primary,
    marginTop: 4, fontWeight: '700',
  },
});//