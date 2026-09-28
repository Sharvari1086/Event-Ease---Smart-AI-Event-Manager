// src/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on app launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(formatUser(session.user));
      setLoading(false);
    });

    // Listen for auth changes (login/logout/token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) setUser(formatUser(session.user));
        else setUser(null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // SIGN UP
  const register = async ({ name, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name, phone },
      },
    });
    if (error) return { ok: false, error: error.message };
    if (data.user) setUser(formatUser(data.user));
    return { ok: true };
  };

  // LOGIN
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { ok: false, error: error.message };
    if (data.user) setUser(formatUser(data.user));
    return { ok: true };
  };

  // LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Convert Supabase user → app user shape
function formatUser(sbUser) {
  const meta = sbUser.user_metadata || {};
  const name = meta.name || sbUser.email?.split('@')[0] || 'User';
  return {
    id: sbUser.id,
    name,
    email: sbUser.email,
    phone: meta.phone || '',
    avatar: name[0].toUpperCase(),
  };
}

export const useAuth = () => useContext(AuthContext);