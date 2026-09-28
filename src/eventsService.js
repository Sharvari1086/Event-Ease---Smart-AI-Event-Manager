// src/eventsService.js
import { supabase } from './supabase';

// ──── Core CRUD ─────────────────────────────────────────

// Get all events for current user
export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('getEvents error:', error.message);
    return { ok: false, error: error.message, data: [] };
  }
  return { ok: true, data };
}

// Get a single event
export async function getEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// Create a new event
export async function createEvent(event) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('events')
    .insert({ ...event, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('createEvent error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

// Update an event
export async function updateEvent(id, updates) {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// Delete an event
export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ──── Utility helpers ───────────────────────────────────

// Days until event (can be negative for past events)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

// Friendly date string
export function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

// ──── Aggregation helpers ───────────────────────────────

// Compute aggregate stats for all events
export function computeStats(events) {
  if (!Array.isArray(events)) return { totalEvents: 0, upcoming: 0, totalGuests: 0, totalBudget: 0 };

  const totalEvents = events.length;

  const upcoming = events.filter((e) => {
    const days = daysUntil(e.event_date);
    return days !== null && days >= 0 && e.status !== 'completed';
  }).length;

  const totalGuests = events.reduce(
    (sum, e) => sum + (parseInt(e.expected_guests) || 0),
    0
  );

  const totalBudget = events.reduce(
    (sum, e) => sum + (parseFloat(e.total_budget) || 0),
    0
  );

  return { totalEvents, upcoming, totalGuests, totalBudget };
}

// ──── AI-style recommendations ──────────────────────────

export function getRecommendations(events) {
  const recs = [];

  if (!Array.isArray(events) || events.length === 0) {
    recs.push({
      id: 'start',
      icon: 'zap',
      color: '#6366f1',
      title: 'Start your first event',
      subtitle: 'Pick a type and let us guide you step-by-step',
      action: 'create',
    });
    return recs;
  }

  // Missing guests
  const noGuests = events.find(
    (e) => !e.expected_guests || e.expected_guests === 0
  );
  if (noGuests) {
    recs.push({
      id: 'guests',
      icon: 'users',
      color: '#10b981',
      title: `Add guests to "${noGuests.name}"`,
      subtitle: 'Track RSVPs and meal preferences',
      action: 'view',
      eventId: noGuests.id,
    });
  }

  // Missing budget
  const noBudget = events.find(
    (e) => !e.total_budget || e.total_budget === 0
  );
  if (noBudget) {
    recs.push({
      id: 'budget',
      icon: 'dollar-sign',
      color: '#f59e0b',
      title: `Set a budget for "${noBudget.name}"`,
      subtitle: 'Get cost predictions and alerts',
      action: 'view',
      eventId: noBudget.id,
    });
  }

  // Urgent upcoming event
  const upcoming = events
    .filter((e) => {
      const d = daysUntil(e.event_date);
      return d !== null && d >= 0 && d <= 60;
    })
    .sort((a, b) => daysUntil(a.event_date) - daysUntil(b.event_date));

  if (upcoming[0]) {
    const d = daysUntil(upcoming[0].event_date);
    recs.push({
      id: 'soon',
      icon: 'clock',
      color: '#ef4444',
      title: `"${upcoming[0].name}" is ${d} days away`,
      subtitle: 'Review tasks and vendor confirmations',
      action: 'view',
      eventId: upcoming[0].id,
    });
  }

  // Always suggest AI
  recs.push({
    id: 'ai',
    icon: 'cpu',
    color: '#8b5cf6',
    title: 'Ask AI for planning help',
    subtitle: 'Chat with your event assistant',
    action: 'ai',
  });

  return recs.slice(0, 4);
}