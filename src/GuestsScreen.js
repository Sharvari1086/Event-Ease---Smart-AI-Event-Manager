// src/GuestsScreen.js
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform,
  TextInput, useWindowDimensions, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getGuests, deleteGuest, updateGuest, toggleCheckIn,
  computeGuestStats, getRsvpStyle, getCategoryStyle, getMealStyle,
  nextRsvp, RSVP_OPTIONS, CATEGORIES,
} from './guestsService';
import {
  getMembers, getAssignments, deleteMember,
  computeMemberStats, getRoleStyle, getStatusStyle, getPriorityStyle,
  deleteAssignment, updateAssignment,
} from './teamService';
import { getEvents, formatDate } from './eventsService';
import AddGuestModal from './AddGuestModal';
import AddTeamMemberModal from './AddTeamMemberModal';
import AddTaskModal from './AddTaskModal';
import { COLORS, SPACING, RADIUS } from './colors';

const SUB_TABS = [
  { key: 'guests', label: 'Guests', icon: 'users' },
  { key: 'team',   label: 'Team',   icon: 'user-check' },
];

export default function GuestsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  // ═══ ALL HOOKS AT TOP — INSIDE THE COMPONENT ════════
  const [subTab, setSubTab] = useState('guests');
  const [events, setEvents] = useState([]);
  const [allGuests, setAllGuests] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskMember, setTaskMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ═══ DATA LOADING ════════════════════════════════════
  const loadData = async () => {
    const [evRes, gRes, mRes, aRes] = await Promise.all([
      getEvents(),
      getGuests(),
      getMembers(),
      getAssignments(),
    ]);
    if (evRes.ok) setEvents(evRes.data);
    if (gRes.ok) setAllGuests(gRes.data);
    if (mRes.ok) setAllMembers(mRes.data);
    if (aRes.ok) setAllAssignments(aRes.data);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Android hardware back button handler
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedEventId !== 'all') {
          setSelectedEventId('all');
          return true;
        }
        if (subTab === 'team') {
          setSubTab('guests');
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [selectedEventId, subTab])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBackToAll = () => {
    setSelectedEventId('all');
    setSearchQuery('');
    setRsvpFilter('all');
    setCategoryFilter('all');
  };

  const handleDeleteGuest = (guest) => {
    const doDelete = async () => {
      await deleteGuest(guest.id);
      loadData();
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${guest.name}"?`)) doDelete();
    } else {
      Alert.alert('Remove guest?', `"${guest.name}" will be removed.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleRsvpCycle = async (guest) => {
    const next = nextRsvp(guest.rsvp);
    setAllGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, rsvp: next } : g))
    );
    const res = await updateGuest(guest.id, { rsvp: next });
    if (!res.ok) loadData();
  };

  const handleCheckIn = async (guest) => {
    setAllGuests((prev) =>
      prev.map((g) =>
        g.id === guest.id ? { ...g, checked_in: !g.checked_in } : g
      )
    );
    const res = await toggleCheckIn(guest.id, guest.checked_in);
    if (!res.ok) loadData();
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

  const isAllView = selectedEventId === 'all';
  const selectedEvent = isAllView
    ? null
    : events.find((e) => e.id === selectedEventId);

  const visibleGuests = isAllView
    ? allGuests
    : allGuests.filter((g) => g.event_id === selectedEventId);

  const searchedGuests = visibleGuests.filter((g) => {
    const q = searchQuery.trim().toLowerCase();
    if (
      q &&
      !g.name?.toLowerCase().includes(q) &&
      !g.phone?.toLowerCase().includes(q)
    )
      return false;
    if (rsvpFilter !== 'all' && g.rsvp !== rsvpFilter) return false;
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
    return true;
  });

  const stats = computeGuestStats(visibleGuests);

  const visibleMembers = isAllView
    ? allMembers
    : allMembers.filter((m) => m.event_id === selectedEventId);
  const visibleAssignments = isAllView
    ? allAssignments
    : allAssignments.filter((a) => a.event_id === selectedEventId);

  const addTargetEvent = isAllView ? events[0] : selectedEvent;

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
                onPress={handleBackToAll}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={22} color={COLORS.text} />
              </TouchableOpacity>
            ) : null}
            <View style={{ flex: 1, marginLeft: !isAllView ? 12 : 0 }}>
              <Text style={styles.title}>
                {isAllView ? 'People' : selectedEvent?.name || 'Event'}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {isAllView
                  ? subTab === 'guests'
                    ? 'Manage your guest list'
                    : 'Assign your team'
                  : subTab === 'guests'
                  ? `${stats.total} ${stats.total === 1 ? 'guest' : 'guests'}`
                  : `${visibleMembers.length} ${
                      visibleMembers.length === 1 ? 'member' : 'members'
                    }`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                if (events.length === 0) {
                  Alert.alert('No events yet', 'Create an event first.');
                  return;
                }
                if (subTab === 'guests') {
                  setShowAddGuest(true);
                } else {
                  setShowAddMember(true);
                }
              }}
              activeOpacity={0.85}
            >
              <Feather
                name={subTab === 'guests' ? 'user-plus' : 'user-check'}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Sub-tabs */}
          <View style={styles.subTabs}>
            {SUB_TABS.map((t) => {
              const active = subTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setSubTab(t.key)}
                  style={[styles.subTab, active && styles.subTabOn]}
                  activeOpacity={0.85}
                >
                  <Feather
                    name={t.icon}
                    size={15}
                    color={active ? '#fff' : COLORS.textMuted}
                  />
                  <Text
                    style={[styles.subTabText, active && { color: '#fff' }]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
                onPress={handleBackToAll}
              />
              {events.map((e) => (
                <Pill
                  key={e.id}
                  label={e.name}
                  icon="calendar"
                  active={selectedEventId === e.id}
                  onPress={() => setSelectedEventId(e.id)}
                />
              ))}
            </ScrollView>
          )}

          {/* ═══ GUESTS VIEW ═══ */}
          {subTab === 'guests' && (
            <>
              <View style={styles.statsGrid}>
                <StatCard icon="users" label="Total" value={stats.total} color={COLORS.primary} />
                <StatCard icon="check-circle" label="Confirmed" value={stats.yes} color={COLORS.success} />
                <StatCard icon="clock" label="Pending" value={stats.pending} color={COLORS.warning} />
                <StatCard icon="log-in" label="Checked in" value={stats.checkedIn} color="#8b5cf6" />
              </View>

              {stats.total > 0 && (
                <View style={styles.seatSummary}>
                  <View style={styles.seatRow}>
                    <Feather name="users" size={14} color={COLORS.primary} />
                    <Text style={styles.seatText}>
                      <Text style={styles.seatBold}>{stats.totalSeats}</Text> total seats
                    </Text>
                  </View>
                  <View style={styles.seatRow}>
                    <Feather name="check" size={14} color={COLORS.success} />
                    <Text style={styles.seatText}>
                      <Text style={styles.seatBold}>{stats.confirmedSeats}</Text> confirmed
                    </Text>
                  </View>
                </View>
              )}

              {isAllView && events.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Guests per event</Text>
                  {events.map((ev) => {
                    const evGuests = allGuests.filter((g) => g.event_id === ev.id);
                    const evStats = computeGuestStats(evGuests);
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        style={styles.eventSummaryCard}
                        onPress={() => setSelectedEventId(ev.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.eventSummaryLeft}>
                          <View style={styles.eventIconWrap}>
                            <Feather name="calendar" size={18} color={COLORS.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventSummaryTitle} numberOfLines={1}>
                              {ev.name}
                            </Text>
                            <Text style={styles.eventSummaryMeta}>
                              {evStats.total} guests · {evStats.yes} confirmed
                            </Text>
                          </View>
                        </View>
                        <View style={styles.eventSummaryRight}>
                          <Text style={styles.eventSummaryCount}>{evStats.total}</Text>
                          <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>All guests</Text>
                </>
              )}

              {!isAllView && (
                <>
                  <BackRow
                    label="All events"
                    current={selectedEvent?.name}
                    onPress={handleBackToAll}
                  />

                  <View style={styles.searchWrap}>
                    <Feather name="search" size={16} color={COLORS.textMuted} />
                    <TextInput
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="Search by name or phone…"
                      placeholderTextColor={COLORS.textLight}
                    />
                    {searchQuery ? (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    <FilterChip
                      label="All"
                      active={rsvpFilter === 'all'}
                      onPress={() => setRsvpFilter('all')}
                    />
                    {RSVP_OPTIONS.map((r) => (
                      <FilterChip
                        key={r.key}
                        label={r.label}
                        color={r.color}
                        active={rsvpFilter === r.key}
                        onPress={() => setRsvpFilter(r.key)}
                      />
                    ))}
                  </ScrollView>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    <FilterChip
                      label="Any category"
                      active={categoryFilter === 'all'}
                      onPress={() => setCategoryFilter('all')}
                    />
                    {CATEGORIES.map((c) => (
                      <FilterChip
                        key={c.key}
                        label={c.key}
                        color={c.color}
                        active={categoryFilter === c.key}
                        onPress={() => setCategoryFilter(c.key)}
                      />
                    ))}
                  </ScrollView>
                </>
              )}

              {searchedGuests.length === 0 ? (
                <EmptyState
                  icon="users"
                  title={
                    visibleGuests.length === 0
                      ? 'No guests yet'
                      : 'No matching guests'
                  }
                  subtitle={
                    visibleGuests.length === 0
                      ? isAllView
                        ? 'Tap the button above to add your first guest'
                        : `No guests for "${selectedEvent?.name}" yet`
                      : 'Try a different filter or search'
                  }
                  action={
                    visibleGuests.length === 0 &&
                    !isAllView && (
                      <TouchableOpacity
                        style={styles.emptyActionBtn}
                        onPress={() => setShowAddGuest(true)}
                        activeOpacity={0.85}
                      >
                        <Feather name="user-plus" size={16} color="#fff" />
                        <Text style={styles.emptyActionText}>
                          Add first guest
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                />
              ) : (
                searchedGuests.map((guest) => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    onCycleRsvp={() => handleRsvpCycle(guest)}
                    onCheckIn={() => handleCheckIn(guest)}
                    onDelete={() => handleDeleteGuest(guest)}
                    showEvent={isAllView}
                    eventName={
                      isAllView
                        ? events.find((e) => e.id === guest.event_id)?.name
                        : null
                    }
                  />
                ))
              )}
            </>
          )}

          {/* ═══ TEAM VIEW ═══ */}
          {subTab === 'team' && (
            <>
              {!isAllView && (
                <BackRow
                  label="All events"
                  current={selectedEvent?.name}
                  onPress={handleBackToAll}
                />
              )}

              {isAllView && events.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Team per event</Text>
                  {events.map((ev) => {
                    const evMembers = allMembers.filter((m) => m.event_id === ev.id);
                    const evAssign = allAssignments.filter((a) => a.event_id === ev.id);
                    const totalTasks = evAssign.length;
                    const doneTasks = evAssign.filter((a) => a.status === 'done').length;
                    return (
                      <TouchableOpacity
                        key={ev.id}
                        style={styles.eventSummaryCard}
                        onPress={() => setSelectedEventId(ev.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.eventSummaryLeft}>
                          <View
                            style={[
                              styles.eventIconWrap,
                              { backgroundColor: `${COLORS.success}20` },
                            ]}
                          >
                            <Feather name="user-check" size={18} color={COLORS.success} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.eventSummaryTitle} numberOfLines={1}>
                              {ev.name}
                            </Text>
                            <Text style={styles.eventSummaryMeta}>
                              {evMembers.length}{' '}
                              {evMembers.length === 1 ? 'member' : 'members'}
                              {totalTasks > 0
                                ? ` · ${doneTasks}/${totalTasks} tasks done`
                                : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.eventSummaryRight}>
                          <Text
                            style={[
                              styles.eventSummaryCount,
                              { color: COLORS.success },
                            ]}
                          >
                            {evMembers.length}
                          </Text>
                          <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>All team members</Text>
                </>
              )}

              {visibleMembers.length === 0 ? (
                <EmptyState
                  icon="user-check"
                  title="No team members yet"
                  subtitle={
                    isAllView
                      ? 'Add team members to assign them tasks per event'
                      : `No team members for "${selectedEvent?.name}"`
                  }
                  action={
                    !isAllView && (
                      <TouchableOpacity
                        style={styles.emptyActionBtn}
                        onPress={() => setShowAddMember(true)}
                        activeOpacity={0.85}
                      >
                        <Feather name="user-plus" size={16} color="#fff" />
                        <Text style={styles.emptyActionText}>
                          Add first member
                        </Text>
                      </TouchableOpacity>
                    )
                  }
                />
              ) : (
                visibleMembers.map((member) => {
                  const mStats = computeMemberStats(member.id, visibleAssignments);
                  const role = getRoleStyle(member.role);
                  return (
                    <MemberCard
                      key={member.id}
                      member={member}
                      stats={mStats}
                      role={role}
                      assignments={visibleAssignments.filter(
                        (a) => a.member_id === member.id
                      )}
                      showEvent={isAllView}
                      eventName={
                        isAllView
                          ? events.find((e) => e.id === member.event_id)?.name
                          : null
                      }
                      onAddTask={() => {
                        setTaskMember(member);
                        setShowAddTask(true);
                      }}
                      onDeleteMember={() => {
                        const doDelete = async () => {
                          await deleteMember(member.id);
                          loadData();
                        };
                        if (Platform.OS === 'web') {
                          if (window.confirm(`Remove ${member.name}?`)) doDelete();
                        } else {
                          Alert.alert(
                            'Remove member?',
                            `${member.name} will be removed.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: doDelete,
                              },
                            ]
                          );
                        }
                      }}
                      onToggleTaskStatus={async (assignment) => {
                        const order = ['todo', 'in-progress', 'done'];
                        const next =
                          order[(order.indexOf(assignment.status) + 1) % 3];
                        setAllAssignments((prev) =>
                          prev.map((a) =>
                            a.id === assignment.id ? { ...a, status: next } : a
                          )
                        );
                        const res = await updateAssignment(assignment.id, {
                          status: next,
                        });
                        if (!res.ok) loadData();
                      }}
                      onDeleteTask={async (assignment) => {
                        await deleteAssignment(assignment.id);
                        loadData();
                      }}
                    />
                  );
                })
              )}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* Modals */}
      <AddGuestModal
        visible={showAddGuest}
        onClose={() => setShowAddGuest(false)}
        eventId={addTargetEvent?.id}
        eventName={addTargetEvent?.name}
        onAdded={() => loadData()}
      />

      <AddTeamMemberModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        eventId={addTargetEvent?.id}
        eventName={addTargetEvent?.name}
        onAdded={() => loadData()}
      />

      <AddTaskModal
        visible={showAddTask}
        onClose={() => {
          setShowAddTask(false);
          setTaskMember(null);
        }}
        eventId={taskMember?.event_id}
        eventName={events.find((e) => e.id === taskMember?.event_id)?.name}
        member={taskMember}
        onAdded={() => loadData()}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────

function BackRow({ label, current, onPress }) {
  return (
    <TouchableOpacity style={styles.backRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.backIconWrap}>
        <Feather name="arrow-left" size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.backText}>{label}</Text>
      {current ? (
        <>
          <View style={styles.backDivider} />
          <Text style={styles.backCurrent} numberOfLines={1}>
            {current}
          </Text>
        </>
      ) : null}
    </TouchableOpacity>
  );
}

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

function FilterChip({ label, color, active, onPress }) {
  const c = color || COLORS.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterChip, active && { backgroundColor: c, borderColor: c }]}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterChipText, active && { color: '#fff' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, color }) {
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

function GuestRow({ guest, onCycleRsvp, onCheckIn, onDelete, showEvent, eventName }) {
  const rsvp = getRsvpStyle(guest.rsvp);
  const category = getCategoryStyle(guest.category);
  const meal = getMealStyle(guest.meal);

  return (
    <View style={styles.guestCard}>
      <View
        style={[styles.guestAvatar, { backgroundColor: `${category.color}25` }]}
      >
        <Text style={[styles.guestAvatarText, { color: category.color }]}>
          {(guest.name || '?')[0].toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.guestTopRow}>
          <Text style={styles.guestName} numberOfLines={1}>
            {guest.name}
          </Text>
          {guest.seats > 1 && (
            <View style={styles.seatPill}>
              <Text style={styles.seatPillText}>+{guest.seats - 1}</Text>
            </View>
          )}
        </View>

        <View style={styles.guestMetaRow}>
          <View
            style={[styles.metaPill, { backgroundColor: `${category.color}15` }]}
          >
            <Feather name={category.icon} size={10} color={category.color} />
            <Text style={[styles.metaPillText, { color: category.color }]}>
              {guest.category}
            </Text>
          </View>
          <View
            style={[styles.metaPill, { backgroundColor: `${meal.color}15` }]}
          >
            <Feather name={meal.icon} size={10} color={meal.color} />
            <Text style={[styles.metaPillText, { color: meal.color }]}>
              {guest.meal}
            </Text>
          </View>
          {showEvent && eventName ? (
            <Text style={styles.metaText} numberOfLines={1}>
              {eventName}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.guestActions}>
        <TouchableOpacity
          style={[styles.rsvpBadge, { backgroundColor: `${rsvp.color}20` }]}
          onPress={onCycleRsvp}
          activeOpacity={0.7}
        >
          <Feather name={rsvp.icon} size={12} color={rsvp.color} />
          <Text style={[styles.rsvpBadgeText, { color: rsvp.color }]}>
            {rsvp.label}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.iconAction,
              guest.checked_in && { backgroundColor: COLORS.success },
            ]}
            onPress={onCheckIn}
          >
            <Feather
              name={guest.checked_in ? 'check' : 'log-in'}
              size={13}
              color={guest.checked_in ? '#fff' : COLORS.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconAction} onPress={onDelete}>
            <Feather name="trash-2" size={13} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MemberCard({
  member,
  stats,
  role,
  assignments,
  showEvent,
  eventName,
  onAddTask,
  onDeleteMember,
  onToggleTaskStatus,
  onDeleteTask,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.memberCard}>
      <TouchableOpacity
        style={styles.memberHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.85}
      >
        <View style={[styles.memberAvatar, { backgroundColor: member.avatar_color }]}>
          <Text style={styles.memberAvatarText}>
            {(member.name || '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          <View style={styles.memberMetaRow}>
            <View style={[styles.rolePill, { backgroundColor: `${role.color}18` }]}>
              <Feather name={role.icon} size={10} color={role.color} />
              <Text style={[styles.rolePillText, { color: role.color }]}>
                {member.role}
              </Text>
            </View>
            {stats.total > 0 && (
              <Text style={styles.memberTaskCount}>
                {stats.done}/{stats.total} tasks
              </Text>
            )}
            {showEvent && eventName ? (
              <Text style={styles.memberTaskCount} numberOfLines={1}>
                · {eventName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.progressMini}>
          <Text
            style={[
              styles.progressMiniText,
              { color: stats.progress === 100 ? COLORS.success : COLORS.text },
            ]}
          >
            {stats.progress}%
          </Text>
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textMuted}
          />
        </View>
      </TouchableOpacity>

      {stats.total > 0 && (
        <View style={styles.memberProgressTrack}>
          <View
            style={[
              styles.memberProgressFill,
              {
                width: `${stats.progress}%`,
                backgroundColor: stats.progress === 100 ? COLORS.success : role.color,
              },
            ]}
          />
        </View>
      )}

      {expanded && (
        <View style={styles.memberBody}>
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.memberActionBtn}
              onPress={onAddTask}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={14} color={COLORS.primary} />
              <Text style={styles.memberActionText}>Assign task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.memberActionBtn, styles.memberActionDanger]}
              onPress={onDeleteMember}
              activeOpacity={0.85}
            >
              <Feather name="trash-2" size={14} color={COLORS.danger} />
              <Text style={[styles.memberActionText, { color: COLORS.danger }]}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>

          {assignments.length === 0 ? (
            <Text style={styles.memberEmpty}>
              No tasks yet — tap "Assign task" above
            </Text>
          ) : (
            assignments.map((a) => {
              const status = getStatusStyle(a.status);
              const priority = getPriorityStyle(a.priority);
              return (
                <View key={a.id} style={styles.taskRow}>
                  <TouchableOpacity
                    onPress={() => onToggleTaskStatus(a)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.taskDot, { backgroundColor: priority.color }]} />
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.taskText,
                      a.status === 'done' && styles.taskTextDone,
                    ]}
                    numberOfLines={2}
                  >
                    {a.task}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.taskStatusPill,
                      { backgroundColor: `${status.color}18` },
                    ]}
                    onPress={() => onToggleTaskStatus(a)}
                    activeOpacity={0.85}
                  >
                    <Feather name={status.icon} size={10} color={status.color} />
                    <Text style={[styles.taskStatusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.taskDeleteBtn}
                    onPress={() => onDeleteTask(a)}
                    hitSlop={6}
                  >
                    <Feather name="x" size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
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

  subTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.sm,
  },
  subTabOn: { backgroundColor: COLORS.primary },
  subTabText: { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },

  pillsRow: { gap: 8, paddingBottom: SPACING.md },
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

  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: SPACING.sm, marginBottom: SPACING.md,
  },
  backIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  backDivider: { width: 1, height: 18, backgroundColor: COLORS.border, marginHorizontal: 4 },
  backCurrent: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textMuted },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', marginBottom: SPACING.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },

  seatSummary: {
    flexDirection: 'row', gap: 20,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seatText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  seatBold: { color: COLORS.text, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, height: 46,
    borderWidth: 1.5, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text },

  filterRow: { gap: 8, paddingBottom: SPACING.md },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.text },

  sectionTitle: {
    fontSize: 17, fontWeight: '800',
    color: COLORS.text, marginTop: SPACING.lg, marginBottom: SPACING.md,
  },
  divider: {
    height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.lg,
  },

  eventSummaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  eventSummaryLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  eventSummaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  eventSummaryMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  eventSummaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventSummaryCount: { fontSize: 18, fontWeight: '800', color: COLORS.primary },

  guestCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  guestAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  guestAvatarText: { fontSize: 17, fontWeight: '800' },
  guestTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  guestName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  seatPill: {
    paddingHorizontal: 6, paddingVertical: 1,
    backgroundColor: COLORS.primarySoft, borderRadius: 6,
  },
  seatPillText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  guestMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 4, flexWrap: 'wrap',
  },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
  },
  metaPillText: { fontSize: 10, fontWeight: '800' },
  metaText: {
    fontSize: 11, color: COLORS.textMuted,
    fontWeight: '600', maxWidth: 100,
  },

  guestActions: { alignItems: 'flex-end', gap: 6 },
  rsvpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  rsvpBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  actionRow: { flexDirection: 'row', gap: 6 },
  iconAction: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },

  memberCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: SPACING.md,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  memberName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  memberMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 4, flexWrap: 'wrap',
  },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  rolePillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  memberTaskCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  progressMini: { alignItems: 'center', gap: 2 },
  progressMiniText: { fontSize: 13, fontWeight: '800' },
  memberProgressTrack: {
    height: 4, backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md, borderRadius: 2, overflow: 'hidden',
  },
  memberProgressFill: { height: '100%', borderRadius: 2 },
  memberBody: {
    padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  memberEmpty: {
    fontSize: 13, color: COLORS.textMuted,
    fontStyle: 'italic', textAlign: 'center', paddingVertical: 8,
  },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
  },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskText: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  taskTextDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  taskStatusText: { fontSize: 10, fontWeight: '800' },
  taskDeleteBtn: { padding: 4 },

  memberActions: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  memberActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
  },
  memberActionDanger: { backgroundColor: '#fef2f2' },
  memberActionText: {
    fontSize: 12, fontWeight: '800', color: COLORS.primary,
  },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub: {
    fontSize: 14, color: COLORS.textMuted,
    marginTop: 4, textAlign: 'center', paddingHorizontal: SPACING.xl,
  },
  emptyActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.lg, paddingVertical: 12,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
  },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});