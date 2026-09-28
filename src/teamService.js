// src/teamService.js
import { supabase } from './supabase';

// ─── Constants ──────────────────────────────────────────
export const ROLES = [
  { key: 'Admin',     color: '#ef4444', icon: 'shield' },
  { key: 'Organizer', color: '#4f46e5', icon: 'target' },
  { key: 'Volunteer', color: '#10b981', icon: 'users' },
  { key: 'Vendor',    color: '#f59e0b', icon: 'truck' },
];

export const AVATAR_COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#ef4444', '#3b82f6', '#14b8a6',
];

export const TASK_STATUS = [
  { key: 'todo',        label: 'To Do',       color: '#6b7280', icon: 'circle' },
  { key: 'in-progress', label: 'In Progress', color: '#f59e0b', icon: 'clock' },
  { key: 'done',        label: 'Done',        color: '#10b981', icon: 'check-circle' },
];

export const PRIORITIES = [
  { key: 'Low',    color: '#10b981' },
  { key: 'Medium', color: '#f59e0b' },
  { key: 'High',   color: '#ef4444' },
];

export function getRoleStyle(key) {
  return ROLES.find((r) => r.key === key) || ROLES[2];
}

export function getStatusStyle(key) {
  return TASK_STATUS.find((s) => s.key === key) || TASK_STATUS[0];
}

export function getPriorityStyle(key) {
  return PRIORITIES.find((p) => p.key === key) || PRIORITIES[1];
}

// ─── Members CRUD ───────────────────────────────────────
export async function getMembers(eventId = null) {
  let query = supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, data: [] };
  return { ok: true, data };
}

export async function addMember(member) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Pick a random avatar color if not provided
  const color = member.avatar_color ||
    AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      user_id: user.id,
      event_id: member.event_id,
      name: member.name?.trim(),
      email: member.email?.trim() || null,
      phone: member.phone?.trim() || null,
      role: member.role || 'Volunteer',
      avatar_color: color,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateMember(id, updates) {
  const { data, error } = await supabase
    .from('team_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteMember(id) {
  const { error } = await supabase.from('team_members').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Task Assignments CRUD ──────────────────────────────
export async function getAssignments(eventId = null) {
  let query = supabase
    .from('task_assignments')
    .select('*')
    .order('created_at', { ascending: false });

  if (eventId) query = query.eq('event_id', eventId);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, data: [] };
  return { ok: true, data };
}

export async function addAssignment(assignment) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('task_assignments')
    .insert({
      user_id: user.id,
      event_id: assignment.event_id,
      member_id: assignment.member_id,
      task: assignment.task?.trim(),
      status: assignment.status || 'todo',
      priority: assignment.priority || 'Medium',
      due_date: assignment.due_date || null,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateAssignment(id, updates) {
  const { data, error } = await supabase
    .from('task_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function deleteAssignment(id) {
  const { error } = await supabase.from('task_assignments').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Stats per member
export function computeMemberStats(memberId, assignments) {
  const mine = assignments.filter((a) => a.member_id === memberId);
  const total = mine.length;
  const done = mine.filter((a) => a.status === 'done').length;
  const inProgress = mine.filter((a) => a.status === 'in-progress').length;
  const pending = mine.filter((a) => a.status === 'todo').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, inProgress, pending, progress };
}