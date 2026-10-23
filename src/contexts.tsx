// MedVerify Context Providers
// Auth context (supports both demo and Supabase modes) and Theme context

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getSupabaseClient, isSupabaseConfigured, getAuthMode, getSupabaseConfigError } from './lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ==================== THEME CONTEXT ====================
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('medverify-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('medverify-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('medverify-theme');
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ==================== AUTH CONTEXT ====================
// Supports two modes:
// - 'demo': UI-only localStorage auth (NOT secure, for development)
// - 'supabase': Real authentication via Supabase Auth
//
// The mode is determined by VITE_AUTH_MODE environment variable.
// When 'supabase' is selected but not configured, a setup error is shown.

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: 'demo' | 'supabase';
  isConfigured: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const authMode = getAuthMode();
  const isConfigured = authMode === 'supabase' ? isSupabaseConfigured() : true;
  const configError = getSupabaseConfigError();

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (authMode === 'supabase') {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (_event: string, session: Session | null) => {
            if (session?.user) {
              setUser(mapSupabaseUser(session.user));
            } else {
              setUser(null);
            }
          }
        );

        return () => subscription.unsubscribe();
      } else {
        // Demo mode: load from localStorage
        const stored = localStorage.getItem('medverify-user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            // Ensure user has an id (add one if missing for backward compatibility)
            if (!parsed.id) {
              parsed.id = `demo-${Date.now()}`;
              localStorage.setItem('medverify-user', JSON.stringify(parsed));
            }
            setUser(parsed);
          } catch {
            localStorage.removeItem('medverify-user');
          }
        }
        setIsLoading(false);
      }
    };

    initAuth();
  }, [authMode]);

  // Map Supabase user to our User type
  const mapSupabaseUser = (sbUser: SupabaseUser): User => ({
    id: sbUser.id,
    name: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || 'User',
    email: sbUser.email || '',
  });

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (authMode === 'supabase') {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoading(false);
        return { success: false, error: 'Supabase is not configured.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setIsLoading(false);

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
        return { success: true };
      }

      return { success: false, error: 'Sign-in failed. Please try again.' };
    }

    // Demo mode
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!email || !password) {
      setIsLoading(false);
      return { success: false, error: 'Please fill in all fields.' };
    }
    if (!email.includes('@')) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const registeredEmails: { id: string; name: string; email: string }[] = 
      JSON.parse(localStorage.getItem('medverify-registered-emails') || '[]');
    const foundUser = registeredEmails.find((u) => u.email === email);
    
    const userData: User = foundUser 
      ? { id: foundUser.id, name: foundUser.name, email: foundUser.email }
      : { id: `demo-${Date.now()}`, name: email.split('@')[0], email };
    
    setUser(userData);
    localStorage.setItem('medverify-user', JSON.stringify(userData));
    setIsLoading(false);
    return { success: true };
  }, [authMode]);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    if (authMode === 'supabase') {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsLoading(false);
        return { success: false, error: 'Supabase is not configured.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });
      setIsLoading(false);

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // If email confirmation is disabled, user is immediately logged in
        if (data.session) {
          setUser(mapSupabaseUser(data.user));
        }
        return { success: true };
      }

      return { success: false, error: 'Sign-up failed. Please try again.' };
    }

    // Demo mode
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!name || !email || !password) {
      setIsLoading(false);
      return { success: false, error: 'Please fill in all fields.' };
    }
    if (name.length < 2) {
      setIsLoading(false);
      return { success: false, error: 'Name must be at least 2 characters.' };
    }
    if (!email.includes('@')) {
      setIsLoading(false);
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 6) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const registeredEmails: { id: string; name: string; email: string }[] = 
      JSON.parse(localStorage.getItem('medverify-registered-emails') || '[]');
    
    if (registeredEmails.find((u) => u.email === email)) {
      setIsLoading(false);
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    const userId = `demo-${Date.now()}`;
    registeredEmails.push({ id: userId, name, email });
    localStorage.setItem('medverify-registered-emails', JSON.stringify(registeredEmails));
    
    const userData: User = { id: userId, name, email };
    setUser(userData);
    localStorage.setItem('medverify-user', JSON.stringify(userData));
    setIsLoading(false);
    return { success: true };
  }, [authMode]);

  const signOut = useCallback(async () => {
    if (authMode === 'supabase') {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } else {
      localStorage.removeItem('medverify-user');
    }
    setUser(null);
  }, [authMode]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      authMode,
      isConfigured,
      configError,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
