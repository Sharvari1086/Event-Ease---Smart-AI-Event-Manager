// src/budgetService.js
import { supabase } from './supabase';

// ─── Categories ─────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { key: 'Venue',          icon: 'home',            color: '#6366f1' },
  { key: 'Catering',       icon: 'coffee',          color: '#f59e0b' },
  { key: 'Decoration',     icon: 'star',            color: '#ec4899' },
  { key: 'Photography',    icon: 'camera',          color: '#8b5cf6' },
  { key: 'Entertainment',  icon: 'music',           color: '#ef4444' },
  { key: 'Transportation', icon: 'truck',           color: '#3b82f6' },
  { key: 'Attire',         icon: 'shopping-bag',    color: '#10b981' },
  { key: 'Gifts',          icon: 'gift',            color: '#f97316' },
  { key: 'Invitations',    icon: 'mail',            color: '#14b8a6' },
  { key: 'Miscellaneous',  icon: 'more-horizontal', color: '#6b7280' },
];

export function getCategoryStyle(key) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === key) ||
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

// ─── CRUD ───────────────────────────────────────────────
export async function getExpenses(eventId = null) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) {
    console.error('getExpenses error:', error.message);
    return { ok: false, error: error.message, data: [] };
  }
  return { ok: true, data };
}

export async function addExpense(expense) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      event_id: expense.event_id,
      category: expense.category,
      amount: Number(expense.amount) || 0,
      note: expense.note?.trim() || null,
      paid: expense.paid ?? true,
      expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error('addExpense error:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function updateExpense(id, updates) {
  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Analytics ──────────────────────────────────────────

// Aggregate: given expenses + total budget → return stats
export function computeBudgetStats(expenses, totalBudget = 0) {
  const spent = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const paid = expenses.filter((e) => e.paid).reduce((s, e) => s + Number(e.amount || 0), 0);
  const pending = spent - paid;
  const remaining = Math.max(totalBudget - spent, 0);
  const over = Math.max(spent - totalBudget, 0);
  const percent = totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 999) : 0;

  return {
    spent,
    paid,
    pending,
    remaining,
    over,
    percent,
    totalBudget,
  };
}

// Group by category with totals + percent of total spent
export function groupByCategory(expenses) {
  const map = {};
  expenses.forEach((e) => {
    const key = e.category || 'Miscellaneous';
    if (!map[key]) map[key] = { category: key, total: 0, count: 0 };
    map[key].total += Number(e.amount || 0);
    map[key].count += 1;
  });

  const totalSpent = Object.values(map).reduce((s, c) => s + c.total, 0);
  return Object.values(map)
    .map((c) => ({
      ...c,
      percent: totalSpent > 0 ? (c.total / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// Determine "mood" for fun badge
export function getBudgetMood(stats) {
  if (stats.totalBudget <= 0) {
    return { label: 'No budget set', icon: 'info', color: '#6b7280' };
  }
  if (stats.over > 0) {
    return { label: 'Over budget', icon: 'alert-triangle', color: '#ef4444' };
  }
  if (stats.percent >= 90) {
    return { label: 'Nearly there', icon: 'alert-circle', color: '#f59e0b' };
  }
  if (stats.percent >= 60) {
    return { label: 'Getting close', icon: 'trending-up', color: '#f59e0b' };
  }
  if (stats.percent >= 25) {
    return { label: 'On track', icon: 'check-circle', color: '#10b981' };
  }
  return { label: 'Just starting', icon: 'zap', color: '#10b981' };
}

// Format: ₹12.5L, ₹45K, ₹1500
export function formatMoney(n) {
  const num = Number(n) || 0;
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000) return `₹${Math.round(num / 1000)}K`;
  return `₹${num}`;
}

export function formatMoneyFull(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

// Friendly date
export function formatExpenseDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today - target) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}