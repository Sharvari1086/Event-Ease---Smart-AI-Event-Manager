// src/BudgetScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform,
  useWindowDimensions, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getExpenses, deleteExpense,
  computeBudgetStats, groupByCategory,
  getBudgetMood, getCategoryStyle,
  formatMoney, formatMoneyFull, formatExpenseDate,
} from './budgetService';
import { getEvents, daysUntil, formatDate } from './eventsService';
import AddExpenseModal from './AddExpenseModal';
import BudgetInsights from './BudgetInsights';
import { COLORS, SPACING, RADIUS } from './colors';

// ─── Event type styling ─────────────────────────────────
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

function getTypeStyle(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.default;
}

export default function BudgetScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  // ═══ HOOKS AT TOP ═══════════════════════════════════
  const [events, setEvents] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // ═══ DATA LOADING ═══════════════════════════════════
  const loadData = async () => {
    const [evRes, exRes] = await Promise.all([
      getEvents(),
      getExpenses(),
    ]);
    if (evRes.ok) setEvents(evRes.data);
    if (exRes.ok) setAllExpenses(exRes.data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Android hardware back button → returns to All Events
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedEventId !== 'all') {
          setSelectedEventId('all');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [selectedEventId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDeleteExpense = (expense) => {
    const doDelete = async () => {
      await deleteExpense(expense.id);
      loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${expense.category}" expense?`)) doDelete();
    } else {
      Alert.alert(
        'Delete expense?',
        `${expense.category} · ${formatMoneyFull(expense.amount)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleAddPress = () => {
    if (events.length === 0) {
      Alert.alert('No events yet', 'Create an event first to add expenses.');
      return;
    }
    setShowAddModal(true);
  };

  // ═══ LOADING STATE ══════════════════════════════════
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ═══ DERIVED ════════════════════════════════════════
  const isAllView = selectedEventId === 'all';
  const selectedEvent = isAllView
    ? null
    : events.find((e) => e.id === selectedEventId);

  const visibleExpenses = isAllView
    ? allExpenses
    : allExpenses.filter((e) => e.event_id === selectedEventId);

  const totalBudget = isAllView
    ? events.reduce((s, e) => s + Number(e.total_budget || 0), 0)
    : Number(selectedEvent?.total_budget || 0);

  const stats = computeBudgetStats(visibleExpenses, totalBudget);
  const mood = getBudgetMood(stats);
  const categories = groupByCategory(visibleExpenses);
  const recent = visibleExpenses.slice(0, 8);
  const addTargetEvent = isAllView ? events[0] : selectedEvent;

  // Per-event summary for All Events view
  const eventSummaries = events.map((ev) => {
    const evExpenses = allExpenses.filter((x) => x.event_id === ev.id);
    const spent = evExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
    const budget = Number(ev.total_budget || 0);
    const paid = evExpenses
      .filter((x) => x.paid)
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const pending = spent - paid;
    const percent = budget > 0 ? Math.min((spent / budget) * 100, 999) : 0;
    const over = Math.max(spent - budget, 0);
    return {
      event: ev,
      spent,
      budget,
      paid,
      pending,
      percent,
      over,
      expenseCount: evExpenses.length,
    };
  });

  // ═══ RENDER ═════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Budget</Text>
              <Text style={styles.subtitle}>Track every rupee</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Event selector pills */}
          {events.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              <EventPill
                label="All Events"
                icon="layers"
                active={isAllView}
                onPress={() => setSelectedEventId('all')}
              />
              {events.map((e) => (
                <EventPill
                  key={e.id}
                  label={e.name}
                  icon="calendar"
                  active={selectedEventId === e.id}
                  onPress={() => setSelectedEventId(e.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* ═══ ALL EVENTS VIEW ═══════════════════════ */}
          {isAllView ? (
            <>
              {/* Overall summary strip */}
              <View style={styles.overallCard}>
                <View style={styles.overallRow}>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.overallLabel}>Total budget</Text>
                    <Text style={styles.overallValue}>
                      {formatMoneyFull(stats.totalBudget)}
                    </Text>
                  </View>
                </View>

                {stats.totalBudget > 0 && (
                  <View style={styles.overallProgressWrap}>
                    <View style={styles.overallProgressTrack}>
                      <View
                        style={[
                          styles.overallProgressFill,
                          {
                            width: `${Math.min(stats.percent, 100)}%`,
                            backgroundColor: mood.color,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.overallProgressText,
                        { color: mood.color },
                      ]}
                    >
                      {Math.round(stats.percent)}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Section heading */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Your events</Text>
                <Text style={styles.sectionHint}>
                  {events.length} {events.length === 1 ? 'event' : 'events'}
                </Text>
              </View>

              {events.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No events yet"
                  subtitle="Create an event to start tracking its budget"
                />
              ) : (
                eventSummaries.map((summary) => (
                  <EventBudgetCard
                    key={summary.event.id}
                    summary={summary}
                    onPress={() => setSelectedEventId(summary.event.id)}
                  />
                ))
              )}
            </>
          ) : (
            // ═══ SINGLE EVENT VIEW ═════════════════════
            <>
              {/* Back row */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => setSelectedEventId('all')}
                activeOpacity={0.7}
              >
                <View style={styles.backIconWrap}>
                  <Feather name="arrow-left" size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.backText}>All events</Text>
                <View style={styles.backDivider} />
                <Text style={styles.backCurrent} numberOfLines={1}>
                  {selectedEvent?.name}
                </Text>
              </TouchableOpacity>

              {/* AI Insights */}
              {selectedEvent && (
                <BudgetInsights
                  event={selectedEvent}
                  expenses={visibleExpenses}
                  stats={stats}
                />
              )}

              {/* Hero card */}
              <View style={styles.heroCard}>
                <View
                  style={[
                    styles.moodBadge,
                    { backgroundColor: `${mood.color}18` },
                  ]}
                >
                  <Feather name={mood.icon} size={14} color={mood.color} />
                  <Text style={[styles.moodText, { color: mood.color }]}>
                    {mood.label}
                  </Text>
                </View>

                <Text style={styles.heroLabel}>Spent</Text>
                <Text style={styles.heroAmount}>
                  {formatMoneyFull(stats.spent)}
                </Text>

                <Text style={styles.heroBudgetLine}>
                  of{' '}
                  {stats.totalBudget > 0
                    ? formatMoneyFull(stats.totalBudget)
                    : 'no budget set'}
                </Text>

                {stats.totalBudget > 0 && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(stats.percent, 100)}%`,
                            backgroundColor: mood.color,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.progressPercent, { color: mood.color }]}
                    >
                      {Math.round(stats.percent)}%
                    </Text>
                  </View>
                )}

                <View style={styles.heroSubRow}>
                  <MiniStat
                    icon="check-circle"
                    label="Paid"
                    value={formatMoney(stats.paid)}
                    color={COLORS.success}
                  />
                  <MiniStat
                    icon="clock"
                    label="Pending"
                    value={formatMoney(stats.pending)}
                    color={COLORS.warning}
                  />
                  <MiniStat
                    icon={stats.over > 0 ? 'alert-triangle' : 'trending-down'}
                    label={stats.over > 0 ? 'Over' : 'Left'}
                    value={
                      stats.over > 0
                        ? formatMoney(stats.over)
                        : formatMoney(stats.remaining)
                    }
                    color={stats.over > 0 ? COLORS.danger : COLORS.primary}
                  />
                </View>
              </View>

              {/* Category breakdown */}
              {categories.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>By category</Text>
                  {categories.map((cat) => (
                    <CategoryBar key={cat.category} data={cat} />
                  ))}
                </>
              )}

              {/* Recent expenses */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {visibleExpenses.length > recent.length && (
                  <Text style={styles.sectionHint}>
                    {visibleExpenses.length} total
                  </Text>
                )}
              </View>

              {recent.length === 0 ? (
                <EmptyState
                  icon="dollar-sign"
                  title="No expenses yet"
                  subtitle="Tap the + button to log your first expense"
                />
              ) : (
                recent.map((exp) => (
                  <ExpenseRow
                    key={exp.id}
                    expense={exp}
                    onDelete={() => handleDeleteExpense(exp)}
                  />
                ))
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* Add expense modal */}
      <AddExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        eventId={addTargetEvent?.id}
        eventName={addTargetEvent?.name}
        onAdded={() => loadData()}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────

function EventPill({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillOn]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Feather
        name={icon}
        size={13}
        color={active ? '#fff' : COLORS.textMuted}
      />
      <Text
        style={[styles.pillText, active && { color: '#fff' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EventBudgetCard({ summary, onPress }) {
  const { event, spent, budget, pending, percent, over, expenseCount } = summary;
  const typeStyle = getTypeStyle(event.type);
  const mood = getBudgetMood({
    totalBudget: budget,
    spent,
    over,
    percent,
    paid: 0,
    pending,
    remaining: Math.max(budget - spent, 0),
  });
  const days = daysUntil(event.event_date);

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.eventAccent, { backgroundColor: typeStyle.color }]} />

      <View style={styles.eventCardBody}>
        <View style={styles.eventCardTop}>
          <View style={[styles.eventIconWrap, { backgroundColor: typeStyle.bg }]}>
            <Feather name={typeStyle.icon} size={20} color={typeStyle.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.name}
            </Text>
            <Text style={styles.eventMeta} numberOfLines={1}>
              {formatDate(event.event_date)}
              {days !== null && days >= 0 ? ` · ${days} days left` : ''}
            </Text>
          </View>

          <View
            style={[styles.moodPill, { backgroundColor: `${mood.color}18` }]}
          >
            <Feather name={mood.icon} size={12} color={mood.color} />
          </View>
        </View>

        <View style={styles.eventAmountRow}>
          <View>
            <Text style={styles.eventAmountLabel}>Spent</Text>
            <Text style={styles.eventAmountValue}>
              {formatMoneyFull(spent)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.eventAmountLabel}>Budget</Text>
            <Text style={styles.eventAmountValueMuted}>
              {budget > 0 ? formatMoneyFull(budget) : '—'}
            </Text>
          </View>
        </View>

        {budget > 0 && (
          <View style={styles.eventProgressTrack}>
            <View
              style={[
                styles.eventProgressFill,
                {
                  width: `${Math.min(percent, 100)}%`,
                  backgroundColor: mood.color,
                },
              ]}
            />
          </View>
        )}

        <View style={styles.eventFooter}>
          <View style={styles.eventFooterItem}>
            <Feather name="list" size={12} color={COLORS.textMuted} />
            <Text style={styles.eventFooterText}>
              {expenseCount} {expenseCount === 1 ? 'expense' : 'expenses'}
            </Text>
          </View>

          <View style={styles.eventFooterItem}>
            <Feather name="clock" size={12} color={COLORS.warning} />
            <Text style={styles.eventFooterText}>
              {formatMoney(pending)} pending
            </Text>
          </View>

          <View style={styles.eventFooterArrow}>
            <Text
              style={[
                styles.eventFooterArrowText,
                { color: typeStyle.color },
              ]}
            >
              View
            </Text>
            <Feather name="arrow-right" size={14} color={typeStyle.color} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MiniStat({ icon, label, value, color }) {
  return (
    <View style={styles.miniStat}>
      <View style={[styles.miniStatIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function CategoryBar({ data }) {
  const style = getCategoryStyle(data.category);
  return (
    <View style={styles.catBar}>
      <View style={styles.catBarTop}>
        <View style={styles.catBarLeft}>
          <View
            style={[
              styles.catBarIcon,
              { backgroundColor: `${style.color}20` },
            ]}
          >
            <Feather name={style.icon} size={14} color={style.color} />
          </View>
          <Text style={styles.catBarName}>{data.category}</Text>
        </View>
        <Text style={styles.catBarAmount}>{formatMoney(data.total)}</Text>
      </View>
      <View style={styles.catBarTrack}>
        <View
          style={[
            styles.catBarFill,
            { width: `${data.percent}%`, backgroundColor: style.color },
          ]}
        />
      </View>
      <Text style={styles.catBarPercent}>
        {Math.round(data.percent)}% of total · {data.count}{' '}
        {data.count === 1 ? 'entry' : 'entries'}
      </Text>
    </View>
  );
}

function ExpenseRow({ expense, onDelete }) {
  const style = getCategoryStyle(expense.category);
  return (
    <TouchableOpacity
      style={styles.expRow}
      activeOpacity={0.85}
      onLongPress={onDelete}
    >
      <View style={[styles.expIcon, { backgroundColor: `${style.color}20` }]}>
        <Feather name={style.icon} size={18} color={style.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.expCategory}>{expense.category}</Text>
        <Text style={styles.expMeta} numberOfLines={1}>
          {formatExpenseDate(expense.expense_date)}
          {expense.note ? ` · ${expense.note}` : ''}
        </Text>
      </View>

      <View style={styles.expRight}>
        <Text style={styles.expAmount}>{formatMoneyFull(expense.amount)}</Text>
        <View
          style={[
            styles.paidBadge,
            {
              backgroundColor: expense.paid
                ? `${COLORS.success}20`
                : `${COLORS.warning}20`,
            },
          ]}
        >
          <Text
            style={[
              styles.paidBadgeText,
              { color: expense.paid ? COLORS.success : COLORS.warning },
            ]}
          >
            {expense.paid ? 'Paid' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, width: '100%' },
  containerWide: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  // Pills
  pillsRow: { gap: 8, paddingBottom: SPACING.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    maxWidth: 200,
  },
  pillOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: {
    fontSize: 13, fontWeight: '700',
    color: COLORS.text, maxWidth: 160,
  },

  // Back row
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  backDivider: {
    width: 1, height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  backCurrent: {
    flex: 1, fontSize: 14, fontWeight: '600',
    color: COLORS.textMuted,
  },

  // Overall summary
  overallCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overallRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallLabel: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  overallValue: {
    fontSize: 20, fontWeight: '800',
    color: COLORS.text, marginTop: 4,
  },
  overallProgressWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: SPACING.lg,
  },
  overallProgressTrack: {
    flex: 1, height: 10, borderRadius: 5,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  overallProgressFill: { height: '100%', borderRadius: 5 },
  overallProgressText: {
    fontSize: 13, fontWeight: '800',
    minWidth: 42, textAlign: 'right',
  },

  // Event summary card
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eventAccent: { height: 5 },
  eventCardBody: { padding: SPACING.lg },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: SPACING.md,
  },
  eventIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  eventTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  eventMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  moodPill: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  eventAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eventAmountLabel: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventAmountValue: {
    fontSize: 20, fontWeight: '800',
    color: COLORS.text, marginTop: 2,
  },
  eventAmountValueMuted: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.textMuted, marginTop: 2,
  },
  eventProgressTrack: {
    height: 8, borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: 'hidden', marginTop: SPACING.sm,
  },
  eventProgressFill: { height: '100%', borderRadius: 4 },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  eventFooterItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  eventFooterText: {
    fontSize: 12, color: COLORS.textMuted, fontWeight: '600',
  },
  eventFooterArrow: {
    marginLeft: 'auto',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  eventFooterArrowText: { fontSize: 13, fontWeight: '800' },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  moodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, marginBottom: SPACING.md,
  },
  moodText: {
    fontSize: 12, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  heroLabel: {
    fontSize: 12, fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  heroAmount: {
    fontSize: 42, fontWeight: '800',
    color: COLORS.text, marginTop: 4, letterSpacing: -1,
  },
  heroBudgetLine: {
    fontSize: 15, fontWeight: '600',
    color: COLORS.textMuted, marginTop: 4,
  },
  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: SPACING.lg,
  },
  progressTrack: {
    flex: 1, height: 12, borderRadius: 6,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 6 },
  progressPercent: {
    fontSize: 14, fontWeight: '800',
    minWidth: 42, textAlign: 'right',
  },
  heroSubRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: SPACING.xl, paddingTop: SPACING.lg,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  miniStat: { alignItems: 'center', flex: 1, gap: 4 },
  miniStatIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  miniStatValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  miniStatLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },

  // Section
  sectionTitle: {
    fontSize: 18, fontWeight: '800',
    color: COLORS.text, marginBottom: SPACING.md,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHint: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  // Category bar
  catBar: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catBarIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  catBarName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  catBarAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  catBarTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: COLORS.border, overflow: 'hidden',
  },
  catBarFill: { height: '100%', borderRadius: 3 },
  catBarPercent: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '600', marginTop: 6,
  },

  // Expense row
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  expIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  expCategory: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  expMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  expRight: { alignItems: 'flex-end', gap: 4 },
  expAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  paidBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 0.3,
  },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: {
    fontSize: 14, color: COLORS.textMuted,
    marginTop: 4, textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});