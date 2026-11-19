// src/VendorsScreen.js
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
  getVendors, deleteVendor, updateVendor, addVendor,
  computeVendorStats, getCategoryStyle, getStatusStyle,
  nextStatus, formatMoney, formatMoneyFull,
} from './vendorService';
import { getEvents } from './eventsService';
import { discoverRealVendors } from './aiService';
import AddVendorModal from './AddVendorModal';
import { COLORS, SPACING, RADIUS } from './colors';
import VendorDetailModal from './VendorDetailModal';

export default function VendorsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const [events, setEvents] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // AI Discovery state
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const loadData = async () => {
    const [evRes, vRes] = await Promise.all([getEvents(), getVendors()]);
    if (evRes.ok) setEvents(evRes.data);
    if (vRes.ok) setAllVendors(vRes.data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedEventId !== 'all') {
          setSelectedEventId('all');
          setSuggestions([]);
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

  const handleDelete = (vendor) => {
    const doDelete = async () => {
      await deleteVendor(vendor.id);
      loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${vendor.name}"?`)) doDelete();
    } else {
      Alert.alert('Remove vendor?', `"${vendor.name}" will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleCycleStatus = async (vendor) => {
    const next = nextStatus(vendor.status);
    setAllVendors((prev) =>
      prev.map((v) => (v.id === vendor.id ? { ...v, status: next } : v))
    );
    const res = await updateVendor(vendor.id, { status: next });
    if (!res.ok) loadData();
  };

  const handleAddPress = () => {
    if (events.length === 0) {
      Alert.alert('No events yet', 'Create an event first.');
      return;
    }
    setShowAddModal(true);
  };

  const isAllView = selectedEventId === 'all';
  const selectedEvent = isAllView ? null : events.find((e) => e.id === selectedEventId);

  // ─── AI Discovery Logic ───────────────────────────────
  const handleDiscover = async () => {
  if (!selectedEvent) return;
  setDiscovering(true);
  setSuggestions([]);
  
  const res = await discoverRealVendors(selectedEvent); // <-- Use the new function
  
  setDiscovering(false);
  if (!res.ok) {
    Alert.alert('Discovery Failed', res.error);
    return;
  }
  setSuggestions(res.vendors || []);
};
  const handleAddSuggested = async (suggestion) => {
    const res = await addVendor({
      event_id: selectedEvent.id,
      name: suggestion.name,
      category: suggestion.category,
      contact_name: suggestion.contactName,
      phone: suggestion.phone,
      price: suggestion.priceEstimate,
      status: 'contacted',
      notes: `AI Discovery: ${suggestion.reason} (${suggestion.distance} away, ${suggestion.rating}★)`
    });

    if (res.ok) {
      // Remove from suggestions list
      setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
      // Refresh main list
      loadData();
    } else {
      Alert.alert('Error', 'Could not add vendor.');
    }
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

  const visibleVendors = isAllView
    ? allVendors
    : allVendors.filter((v) => v.event_id === selectedEventId);

  const stats = computeVendorStats(visibleVendors);
  const addTargetEvent = isAllView ? events[0] : selectedEvent;

  const eventSummaries = events.map((ev) => {
    const evVendors = allVendors.filter((v) => v.event_id === ev.id);
    const evStats = computeVendorStats(evVendors);
    return { event: ev, ...evStats };
  });

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
            {!isAllView ? (
              <TouchableOpacity
                style={styles.headerBackBtn}
                onPress={() => { setSelectedEventId('all'); setSuggestions([]); }}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={22} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1, marginLeft: !isAllView ? 12 : 0 }}>
              <Text style={styles.title}>
                {isAllView ? 'Vendors' : selectedEvent?.name || 'Event'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {isAllView
                  ? `${stats.total} vendors · ${stats.booked} booked`
                  : `${stats.total} vendors for this event`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Event pills */}
          {events.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              <Pill
                label="All Events"
                icon="layers"
                active={isAllView}
                onPress={() => { setSelectedEventId('all'); setSuggestions([]); }}
              />
              {events.map((e) => (
                <Pill
                  key={e.id}
                  label={e.name}
                  icon="calendar"
                  active={selectedEventId === e.id}
                  onPress={() => { setSelectedEventId(e.id); setSuggestions([]); }}
                />
              ))}
            </ScrollView>
          )}

          {/* ═══ ALL EVENTS VIEW ═══ */}
          {isAllView ? (
            <>
              <View style={styles.overallCard}>
                <View style={styles.overallRow}>
                  <View>
                    <Text style={styles.overallLabel}>Total Quoted</Text>
                    <Text style={styles.overallValue}>{formatMoney(stats.totalCost)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.overallLabel}>Booked Value</Text>
                    <Text style={[styles.overallValue, { color: COLORS.success }]}>
                      {formatMoney(stats.bookedCost)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Vendors per event</Text>
                <Text style={styles.sectionHint}>{events.length} events</Text>
              </View>

              {events.length === 0 ? (
                <EmptyState icon="briefcase" title="No events yet" subtitle="Create an event to add vendors" />
              ) : (
                eventSummaries.map((summary) => (
                  <TouchableOpacity
                    key={summary.event.id}
                    style={styles.eventSummaryCard}
                    onPress={() => setSelectedEventId(summary.event.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.eventIconWrap}>
                      <Feather name="calendar" size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventSummaryTitle} numberOfLines={1}>
                        {summary.event.name}
                      </Text>
                      <Text style={styles.eventSummaryMeta}>
                        {summary.total} vendors · {summary.booked} booked
                      </Text>
                    </View>
                    <View style={styles.eventSummaryRight}>
                      <Text style={styles.eventSummaryCount}>{formatMoney(summary.totalCost)}</Text>
                      <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          ) : (
            // ═══ SINGLE EVENT VIEW ═══
            <>
              {/* Stats grid */}
              <View style={styles.statsGrid}>
                <MiniStat icon="briefcase" label="Total" value={stats.total} color={COLORS.primary} />
                <MiniStat icon="message-circle" label="Negotiating" value={stats.negotiating} color={COLORS.warning} />
                <MiniStat icon="check-circle" label="Booked" value={stats.booked} color={COLORS.success} />
                <MiniStat icon="dollar-sign" label="Booked Cost" value={formatMoney(stats.bookedCost)} color="#8b5cf6" />
              </View>

              {/* ═══ AI VENDOR DISCOVERY ═══ */}
              <View style={styles.discoveryCard}>
                <View style={styles.discoveryHeader}>
                  <View style={styles.discoveryTitleWrap}>
                    <View style={styles.aiBadge}>
                      <Feather name="cpu" size={14} color="#fff" />
                    </View>
                    <Text style={styles.discoveryTitle}>AI Local Discovery</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.discoverBtn}
                    onPress={handleDiscover}
                    disabled={discovering}
                  >
                    {discovering ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="search" size={14} color="#fff" />
                        <Text style={styles.discoverBtnText}>Find Nearby</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.discoverySub}>
                  Find real-time available banquet halls, caterers, and photographers near your venue.
                </Text>

                {/* Discovery Results */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsWrap}>
                    <Text style={styles.suggestionsLabel}>Available Nearby</Text>
                                  {suggestions.map((s, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={styles.suggestionItem}
                      onPress={() => {
                        setSelectedVendor(s);
                        setShowDetailModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionLeft}>
                        <Text style={styles.suggestionName}>{s.name}</Text>
                        <View style={styles.suggestionMetaRow}>
                          <Text style={styles.suggestionCategory}>{s.category}</Text>
                          <View style={styles.metaDot} />
                          <Text style={styles.suggestionDistance}>{s.distance}</Text>
                          <View style={styles.metaDot} />
                          <Feather name="star" size={10} color="#f59e0b" />
                          <Text style={styles.suggestionRating}>{s.rating}</Text>
                        </View>
                        <Text style={styles.suggestionPrice}>
                          Est. {formatMoneyFull(s.priceEstimate)}
                        </Text>
                      </View>
                      <View style={styles.addSuggestedBtn}>
                        <Text style={styles.addSuggestedText}>View</Text>
                        <Feather name="chevron-right" size={14} color={COLORS.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                  </View>
                )}
              </View>

              <Text style={styles.sectionTitle}>My Vendors</Text>

              {visibleVendors.length === 0 ? (
                <EmptyState
                  icon="briefcase"
                  title="No vendors yet"
                  subtitle="Tap the + button to add your first vendor or use AI Discovery above."
                  action={
                    <TouchableOpacity
                      style={styles.emptyActionBtn}
                      onPress={() => setShowAddModal(true)}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={styles.emptyActionText}>Add manually</Text>
                    </TouchableOpacity>
                  }
                />
              ) : (
                visibleVendors.map((vendor) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    onCycleStatus={() => handleCycleStatus(vendor)}
                    onDelete={() => handleDelete(vendor)}
                  />
                ))
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      <AddVendorModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        eventId={addTargetEvent?.id}
        eventName={addTargetEvent?.name}
        onAdded={() => loadData()}
      />
            <VendorDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        vendor={selectedVendor}
        onBook={(vendorToBook) => {
          handleAddSuggested(vendorToBook);
          setShowDetailModal(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────
function Pill({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillOn]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Feather name={icon} size={13} color={active ? '#fff' : COLORS.textMuted} />
      <Text style={[styles.pillText, active && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MiniStat({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function BudgetSyncCard({ totalBudget, bookedCost }) {
  const remaining = Math.max(totalBudget - bookedCost, 0);
  const percentUsed = totalBudget > 0 ? Math.min((bookedCost / totalBudget) * 100, 100) : 0;
  const isOver = bookedCost > totalBudget;
  
  // Color logic
  const progressColor = isOver ? COLORS.danger : percentUsed > 80 ? COLORS.warning : COLORS.success;

  return (
    <View style={styles.budgetSyncCard}>
      <View style={styles.budgetSyncHeader}>
        <View>
          <Text style={styles.budgetSyncLabel}>Total Event Budget</Text>
          <Text style={styles.budgetSyncValue}>{formatMoneyFull(totalBudget)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.budgetSyncLabel}>Remaining</Text>
          <Text style={[styles.budgetSyncValue, { color: isOver ? COLORS.danger : COLORS.text }]}>
            {isOver ? `Over by ${formatMoneyFull(bookedCost - totalBudget)}` : formatMoneyFull(remaining)}
          </Text>
        </View>
      </View>

      <View style={styles.budgetSyncProgressTrack}>
        <View
          style={[
            styles.budgetSyncProgressFill,
            { width: `${percentUsed}%`, backgroundColor: progressColor },
          ]}
        />
      </View>

      <View style={styles.budgetSyncFooter}>
        <Text style={styles.budgetSyncHint}>
          {formatMoneyFull(bookedCost)} committed to vendors
        </Text>
        <Text style={[styles.budgetSyncPercent, { color: progressColor }]}>
          {Math.round(percentUsed)}%
        </Text>
      </View>
    </View>
  );
}
function VendorRow({ vendor, onCycleStatus, onDelete }) {
  const category = getCategoryStyle(vendor.category);
  const status = getStatusStyle(vendor.status);

  return (
    <View style={styles.vendorCard}>
      <View style={[styles.vendorIcon, { backgroundColor: category.bg }]}>
        <Feather name={category.icon} size={20} color={category.color} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.vendorName} numberOfLines={1}>{vendor.name}</Text>
        
        <View style={styles.vendorMetaRow}>
          <Text style={[styles.vendorCategory, { color: category.color }]}>
            {vendor.category}
          </Text>
          {vendor.contact_name ? (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.vendorContact} numberOfLines={1}>
                {vendor.contact_name}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.vendorBottomRow}>
          <Text style={styles.vendorPrice}>
            {vendor.price > 0 ? formatMoneyFull(vendor.price) : 'No price set'}
          </Text>

          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}
            onPress={onCycleStatus}
            activeOpacity={0.75}
          >
            <Feather name={status.icon} size={11} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={10}>
        <Feather name="trash-2" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={32} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
      {action ? <View style={{ marginTop: SPACING.lg }}>{action}</View> : null}
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
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  pillsRow: { gap: 8, paddingBottom: SPACING.lg },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 1.5, borderColor: COLORS.border,
    maxWidth: 200,
  },
  pillOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.text, maxWidth: 160 },

  overallCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
  },
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLabel: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  overallValue: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 4 },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statCard: {
    width: '48%', backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },

  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: COLORS.text,
    marginBottom: SPACING.md, marginTop: SPACING.lg,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.lg, marginBottom: SPACING.md,
  },
  sectionHint: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },

  eventSummaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  eventIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eventSummaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventSummaryMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  eventSummaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventSummaryCount: { fontSize: 15, fontWeight: '800', color: COLORS.success },

  // AI Discovery
  discoveryCard: {
    backgroundColor: '#f5f3ff', // Light purple
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  discoveryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  discoveryTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#8b5cf6',
    alignItems: 'center', justifyContent: 'center',
  },
  discoveryTitle: { fontSize: 16, fontWeight: '800', color: '#4c1d95' },
  discoverySub: { fontSize: 12, color: '#6b7280', marginBottom: SPACING.md },
  discoverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  discoverBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  suggestionsWrap: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#ddd6fe',
  },
  suggestionsLabel: {
    fontSize: 11, fontWeight: '800', color: '#8b5cf6',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#ede9fe',
  },
  suggestionLeft: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  suggestionMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  suggestionCategory: { fontSize: 11, fontWeight: '700', color: '#8b5cf6' },
  suggestionDistance: { fontSize: 11, color: COLORS.textMuted },
  suggestionRating: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  suggestionPrice: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  addSuggestedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  addSuggestedText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  // Vendor Row
  vendorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  vendorIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  vendorName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  vendorMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  vendorCategory: { fontSize: 12, fontWeight: '700' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.border, marginHorizontal: 6 },
  vendorContact: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', flex: 1 },
  
  vendorBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8,
  },
  vendorPrice: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  deleteBtn: { padding: 8 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.xl },
  emptyActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
  },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});