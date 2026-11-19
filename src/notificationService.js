// src/notificationService.js
import { supabase } from './supabase';
import { getEvents } from './eventsService';
import { getExpenses } from './budgetService';
import { getAssignments } from './teamService';
import * as Notifications from 'expo-notifications';

export const NOTIF_TYPES = {
  task:    { icon: 'check-square', color: '#10b981', bg: '#ecfdf5' },
  payment: { icon: 'dollar-sign',  color: '#f59e0b', bg: '#fffbeb' },
  rsvp:    { icon: 'users',        color: '#8b5cf6', bg: '#f5f3ff' },
  system:  { icon: 'bell',         color: '#4f46e5', bg: '#eef2ff' },
};

export function getNotifStyle(type) {
  return NOTIF_TYPES[type] || NOTIF_TYPES.system;
}

// ═══ PERMISSIONS & NATIVE PUSH ═══
export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

async function sendNativeNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // null means show immediately
  });
}

// ═══ CRUD ═══
export async function getNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getNotifications error:', error.message);
    return { ok: false, error: error.message, data: [] };
  }
  return { ok: true, data };
}

export async function addNotification({ title, body, type = 'system' }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: user.id, title, body, type })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function markAsRead(id) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);
    
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ═══ REAL-TIME DATA SYNC GENERATOR ═══
export async function syncNotifications() {
  try {
    const [evRes, expRes, taskRes, notifRes] = await Promise.all([
      getEvents(),
      getExpenses(),
      getAssignments(),
      getNotifications()
    ]);

    if (!evRes.ok) return;

    const events = evRes.data || [];
    const expenses = expRes.ok ? expRes.data : [];
    const tasks = taskRes.ok ? taskRes.data : [];
    const existingNotifs = notifRes.ok ? notifRes.data : [];
    
    const existingTitles = new Set(existingNotifs.map(n => n.title));
    const newNotifs = [];

    // 1. Check Events (Budget & Countdown)
    events.forEach(ev => {
      if (ev.event_date) {
        const days = Math.ceil((new Date(ev.event_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 7) {
          const title = `${days} Days Left: ${ev.name}`;
          if (!existingTitles.has(title)) {
            newNotifs.push({
              title,
              body: `Your event is almost here! Make sure all vendors and tasks are confirmed.`,
              type: 'system'
            });
          }
        }
      }

      if (ev.total_budget > 0) {
        const evExpenses = expenses.filter(e => e.event_id === ev.id);
        const spent = evExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const percent = (spent / ev.total_budget) * 100;
        
        if (percent >= 85) {
          const title = `Budget Alert: ${ev.name}`;
          if (!existingTitles.has(title)) {
            newNotifs.push({
              title,
              body: `You have used ${Math.round(percent)}% of your budget (₹${spent} of ₹${ev.total_budget}). Please review expenses.`,
              type: 'payment'
            });
          }
        }
      }
    });

    // 2. Check Tasks (Due in 3 days or less)
    tasks.forEach(task => {
      if (task.status !== 'done' && task.due_date) {
        const days = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (days >= 0 && days <= 3) {
          const title = `Task Due Soon: ${task.task}`;
          if (!existingTitles.has(title)) {
            newNotifs.push({
              title,
              body: `This task is due in ${days === 0 ? 'Today' : days + ' days'}. Please assign or complete it.`,
              type: 'task'
            });
          }
        }
      }
    });

    // 3. Save new notifications to DB and trigger native push
    if (newNotifs.length > 0) {
      console.log(`🔔 Generating ${newNotifs.length} real notifications`);
      for (const n of newNotifs) {
        await addNotification(n);
        // Trigger the actual phone banner
        await sendNativeNotification(n.title, n.body);
      }
    }
  } catch (error) {
    console.error('syncNotifications error:', error);
  }
}