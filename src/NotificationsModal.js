// src/NotificationsModal.js
import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { markAsRead, markAllAsRead, getNotifStyle } from './notificationService';
import { COLORS, SPACING, RADIUS } from './colors';

export default function NotificationsModal({ visible, onClose, notifications, onUpdate }) {
  const [markingAll, setMarkingAll] = useState(false);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllAsRead();
    setMarkingAll(false);
    if (onUpdate) onUpdate();
  };

  const handleTap = async (notif) => {
    if (!notif.read) {
      await markAsRead(notif.id);
      if (onUpdate) onUpdate();
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Feather name="x" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Notifications</Text>
          
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAll} disabled={markingAll}>
              {markingAll ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.markAllText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="bell-off" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySub}>You have no notifications right now.</Text>
            </View>
          ) : (
            notifications.map((notif) => {
              const style = getNotifStyle(notif.type);
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifCard, !notif.read && styles.notifCardUnread]}
                  onPress={() => handleTap(notif)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.notifIcon, { backgroundColor: style.bg }]}>
                    <Feather name={style.icon} size={18} color={style.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifTitle, !notif.read && { fontWeight: '800' }]}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifBody}>{notif.body}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.created_at).toLocaleDateString('en-IN', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  {!notif.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card,
  },
  closeBtn: { padding: 8 },
  topTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  markAllText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  
  scroll: { padding: SPACING.lg },
  
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  notifCardUnread: {
    borderColor: COLORS.primarySoft,
    backgroundColor: '#f8fafc',
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  notifBody: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, lineHeight: 18 },
  notifTime: { fontSize: 11, color: COLORS.textLight, marginTop: 6, fontWeight: '600' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 6,
  },

  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});