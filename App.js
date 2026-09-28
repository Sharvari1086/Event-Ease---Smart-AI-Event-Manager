// App.js
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/AuthContext';
import RootNavigator from './src/RootNavigator';
import { COLORS } from './src/colors';

// Global error handler — prints every uncaught error to the terminal
if (global.ErrorUtils) {
  const original = global.ErrorUtils.getGlobalHandler?.();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('🚨 GLOBAL ERROR:', error?.message);
    console.log('🚨 STACK:', error?.stack);
    original?.(error, isFatal);
  });
}

function InnerApp() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  return <RootNavigator />;
}

export default function App() {
  useEffect(() => {
    console.log('✅ App.js mounted at', new Date().toISOString());
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <InnerApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});