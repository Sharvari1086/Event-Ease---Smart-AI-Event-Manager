// src/CustomDrawer.js
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, RADIUS } from './colors';

export default function CustomDrawer(props) {
  const { user, logout } = useAuth();

  const firstName =
    user?.name?.split(' ')[0] || 'User';
  const email = user?.email || '';
  const initial = (user?.name?.[0] || 'U').toUpperCase();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* User header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {firstName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Main navigation */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={{ paddingTop: 0 }}
        >
          <Text style={styles.sectionLabel}>
            Navigate
          </Text>
          <DrawerItemList {...props} />

          <View style={styles.dividerLight} />

          <Text style={styles.sectionLabel}>
            Quick actions
          </Text>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('MainTabs', {
                screen: 'Events',
                params: { openCreate: true },
              });
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: `${COLORS.primary}20` },
              ]}
            >
              <Feather
                name="plus-circle"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.quickLabel}>
              Create event
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('MainTabs', {
                screen: 'AI',
              });
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: '#8b5cf620' },
              ]}
            >
              <Feather
                name="cpu"
                size={18}
                color="#8b5cf6"
              />
            </View>
            <Text style={styles.quickLabel}>
              Ask AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('MainTabs', {
                screen: 'Guests',
              });
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.quickIcon,
                { backgroundColor: `${COLORS.success}20` },
              ]}
            >
              <Feather
                name="user-plus"
                size={18}
                color={COLORS.success}
              />
            </View>
            <Text style={styles.quickLabel}>
              Add guest
            </Text>
          </TouchableOpacity>
        </DrawerContentScrollView>
      </ScrollView>

      {/* Footer — logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather
            name="log-out"
            size={18}
            color={COLORS.danger}
          />
          <Text style={styles.logoutText}>
            Log out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.card,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  email: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  dividerLight: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
  },

  scroll: {
    paddingBottom: SPACING.lg,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },

  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
});