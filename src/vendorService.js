// src/vendorService.js
import { supabase } from './supabase';

// ─── Config ─────────────────────────────────────────────
export const VENDOR_CATEGORIES = [
  { key: 'Catering',       icon: 'coffee',       color: '#f59e0b', bg: '#fffbeb' },
  { key: 'Photography',    icon: 'camera',       color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'Decoration',     icon: 'star',         color: '#ec4899', bg: '#fdf2f8' },
  { key: 'Venue',          icon: 'home',         color: '#6366f1', bg: '#eef2ff' },
  { key: 'Entertainment',  icon: 'music',        color: '#ef4444', bg: '#fef2f2' },
  { key: 'Transportation', icon: 'truck',        color: '#3b82f6', bg: '#eff6ff' },
  { key: 'Security',       icon: 'shield',       color: '#14b8a6', bg: '#f0fdfa' },
  { key: 'Other',          icon: 'more-horizontal', color: '#6b7280', bg: '#f3f4f6' },
];

export const VENDOR_STATUS = [
  { key: 'contacted',   label: 'Contacted',   color: '#3b82f6', icon: 'phone' },
  { key: 'negotiating', label: 'Negotiating', color: '#f59e0b', icon: 'message-circle' },
  { key: 'booked',      label: 'Booked',      color: '#10b981', icon: 'check-circle' },
  { key: 'completed',   label: 'Completed',   color: '#6b7280', icon: 'flag' },
];

export function getCategoryStyle(key) {
  return VENDOR_CATEGORIES.find((c) => c.key === key) || VENDOR_CATEGORIES[7];
}

export function getStatusStyle(key) {
  return VENDOR_STATUS.find((s) => s.key === key) || VENDOR_STATUS[0];
}

export function nextStatus(current) {
  const order = ['contacted', 'negotiating', 'booked', 'completed'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

// ─── CRUD ───────────────────────────────────────────────
export async function getVendors(eventId = null) {
  let query = supabase
    .from('vendors')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, data: [] };
  return { ok: true, data };
}

export async function addVendor(vendor) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      user_id: user.id,
      event_id: vendor.event_id,
      name: vendor.name?.trim(),
      category: vendor.category,
      contact_name: vendor.contact_name?.trim() || null,
      phone: vendor.phone?.trim() || null,
      email: vendor.email?.trim() || null,
      price: Number(vendor.price) || 0,
      status: vendor.status || 'contacted',
      notes: vendor.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateVendor(id, updates) {
  const { data, error } = await supabase
    .from('vendors')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteVendor(id) {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Stats ──────────────────────────────────────────────
export function computeVendorStats(vendors) {
  const total = vendors.length;
  
  // A vendor is "committed" if they are booked or completed
  const bookedVendors = vendors.filter((v) => v.status === 'booked' || v.status === 'completed');
  const booked = bookedVendors.length;
  
  const negotiating = vendors.filter((v) => v.status === 'negotiating').length;
  
  // Total cost of ALL quotes
  const totalCost = vendors.reduce((sum, v) => sum + Number(v.price || 0), 0);
  
  // Total cost of ONLY booked/completed vendors
  const bookedCost = bookedVendors.reduce((sum, v) => sum + Number(v.price || 0), 0);

  return { total, booked, negotiating, totalCost, bookedCost };
}

// ─── Money Format ───────────────────────────────────────
export function formatMoney(amount) {
  const n = Number(amount) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
  return `₹${n}`;
}

export function formatMoneyFull(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}