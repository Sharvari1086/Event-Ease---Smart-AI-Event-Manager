// src/guestsService.js
import { supabase } from './supabase';

// ─── Constants ──────────────────────────────────────────
export const RSVP_OPTIONS = [
  { key: 'pending', label: 'Pending', color: '#f59e0b', icon: 'clock' },
  { key: 'yes',     label: 'Confirmed', color: '#10b981', icon: 'check-circle' },
  { key: 'maybe',   label: 'Maybe',   color: '#6366f1', icon: 'help-circle' },
  { key: 'no',      label: 'Declined', color: '#ef4444', icon: 'x-circle' },
];

export const CATEGORIES = [
  { key: 'Family',    color: '#ec4899', icon: 'home' },
  { key: 'Friend',    color: '#3b82f6', icon: 'smile' },
  { key: 'Colleague', color: '#8b5cf6', icon: 'briefcase' },
  { key: 'VIP',       color: '#f59e0b', icon: 'star' },
  { key: 'Other',     color: '#6b7280', icon: 'user' },
];

export const MEALS = [
  { key: 'Veg',     color: '#10b981', icon: 'leaf' },
  { key: 'Non-Veg', color: '#ef4444', icon: 'feather' },
  { key: 'Vegan',   color: '#14b8a6', icon: 'sun' },
  { key: 'Jain',    color: '#f59e0b', icon: 'shield' },
];

// ─── CRUD ───────────────────────────────────────────────
export async function getGuests(eventId = null) {
  let query = supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) {
    console.error('getGuests error:', error.message);
    return { ok: false, error: error.message, data: [] };
  }
  return { ok: true, data };
}

export async function addGuest(guest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('guests')
    .insert({
      user_id: user.id,
      event_id: guest.event_id,
      name: guest.name?.trim(),
      phone: guest.phone?.trim() || null,
      email: guest.email?.trim() || null,
      rsvp: guest.rsvp || 'pending',
      category: guest.category || 'Friend',
      meal: guest.meal || 'Veg',
      seats: Number(guest.seats) || 1,
      notes: guest.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// Bulk add from array (CSV import)
export async function bulkAddGuests(eventId, guestsArray) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const rows = guestsArray.map((g) => ({
    user_id: user.id,
    event_id: eventId,
    name: g.name?.trim(),
    phone: g.phone?.trim() || null,
    email: g.email?.trim() || null,
    rsvp: 'pending',
    category: g.category || 'Friend',
    meal: g.meal || 'Veg',
    seats: Number(g.seats) || 1,
  }));

  const { data, error } = await supabase.from('guests').insert(rows).select();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data, count: data?.length || 0 };
}

export async function updateGuest(id, updates) {
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteGuest(id) {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleCheckIn(id, currentValue) {
  const updates = {
    checked_in: !currentValue,
    checked_in_at: !currentValue ? new Date().toISOString() : null,
  };
  return updateGuest(id, updates);
}

// ─── Stats ──────────────────────────────────────────────
export function computeGuestStats(guests) {
  const total = guests.length;
  const yes = guests.filter((g) => g.rsvp === 'yes').length;
  const pending = guests.filter((g) => g.rsvp === 'pending').length;
  const maybe = guests.filter((g) => g.rsvp === 'maybe').length;
  const no = guests.filter((g) => g.rsvp === 'no').length;
  const checkedIn = guests.filter((g) => g.checked_in).length;
  const totalSeats = guests.reduce((s, g) => s + (g.seats || 1), 0);
  const confirmedSeats = guests
    .filter((g) => g.rsvp === 'yes')
    .reduce((s, g) => s + (g.seats || 1), 0);

  return { total, yes, pending, maybe, no, checkedIn, totalSeats, confirmedSeats };
}

// ─── Helpers ────────────────────────────────────────────
export function getRsvpStyle(key) {
  return RSVP_OPTIONS.find((r) => r.key === key) || RSVP_OPTIONS[0];
}

export function getCategoryStyle(key) {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

export function getMealStyle(key) {
  return MEALS.find((m) => m.key === key) || MEALS[0];
}

// Cycle RSVP status on tap
export function nextRsvp(current) {
  const order = ['pending', 'yes', 'maybe', 'no'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}