// src/RootNavigator.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useAuth } from './AuthContext';
import { COLORS } from './colors';

import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ProfileScreen from './ProfileScreen';
import HomeScreen from './HomeScreen';
import EventsScreen from './EventsScreen';
import GuestsScreen from './GuestsScreen';
import BudgetScreen from './BudgetScreen';
import AIScreen from './AIScreen';
import CreateEventScreen from './CreateEventScreen';
import EventSuccessScreen from './EventSuccessScreen';
import EventOverviewScreen from './EventOverviewScreen';
import VendorsScreen from './VendorsScreen';


const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Events: 'calendar',
  Guests: 'users',
  Budget: 'dollar-sign',
  Vendors: 'briefcase',
  AI: 'cpu',
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Feather
            name={TAB_ICONS[route.name] || 'circle'}
            size={22}
            color={color}
          />
        ),
      })}
    >
       <Tabs.Screen name="Home"    component={HomeScreen} />
      <Tabs.Screen name="Events"  component={EventsScreen} />
      <Tabs.Screen name="Guests"  component={GuestsScreen} />
      <Tabs.Screen name="Budget"  component={BudgetScreen} />
      <Tabs.Screen name="Vendors" component={VendorsScreen} />
      <Tabs.Screen name="AI"      component={AIScreen} />
    </Tabs.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EventSuccess"
        component={EventSuccessScreen}
        options={{ presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen
  name="Profile"
  component={ProfileScreen}
/>
      <Stack.Screen
        name="EventOverview"
        component={EventOverviewScreen}
      />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}