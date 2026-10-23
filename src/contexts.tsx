// MedVerify Context Providers
// Auth context (UI-only, no real backend) and Theme context

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ==================== THEME CONTEXT ====================
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): Theme {
  // Check localStorage first
  const stored = localStorage.getItem('medverify-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  
  // Fall back to system preference
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

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
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
// ⚠️ DEMO-ONLY AUTHENTICATION
// This is NOT secure authentication. It uses localStorage with plain-text
// passwords for UI demonstration purposes only.
//
// For production use, you MUST integrate a real authentication service:
// - Supabase Auth (free tier available)
// - Firebase Authentication
// - Auth0
// - AWS Cognito
// - Or another identity provider
//
// Never store passwords in localStorage. Never trust client-side auth for
// protecting sensitive data or operations.

interface User {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted session on mount
  useEffect(() => {
    const stored = localStorage.getItem('medverify-user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('medverify-user');
      }
    }
  }, []);

  // ⚠️ DEMO AUTH — passwords are NOT stored.
  // Only the email address is tracked to avoid "already registered" errors.
  // The password field exists for UI completeness but is discarded immediately.
  // For production, replace this entire AuthProvider with a real identity service.

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    
    // Simulate network delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // Basic validation
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

    // Password is NOT stored or verified — it is discarded after validation.
    // In a real app, credentials would be verified server-side.

    // Look up previously registered email (name only, no password)
    const registeredEmails: { name: string; email: string }[] = 
      JSON.parse(localStorage.getItem('medverify-registered-emails') || '[]');
    const foundUser = registeredEmails.find((u) => u.email === email);
    
    const userData = foundUser 
      ? { name: foundUser.name, email: foundUser.email }
      : { name: email.split('@')[0], email };
    
    setUser(userData);
    localStorage.setItem('medverify-user', JSON.stringify(userData));
    setIsLoading(false);
    return { success: true };
  };

  const signUp = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

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

    // Password is NOT stored — it is discarded after validation.

    // Track only the email (and display name) to prevent duplicate sign-ups
    const registeredEmails: { name: string; email: string }[] = 
      JSON.parse(localStorage.getItem('medverify-registered-emails') || '[]');
    
    if (registeredEmails.find((u) => u.email === email)) {
      setIsLoading(false);
      return { success: false, error: 'An account with this email already exists. Please sign in.' };
    }

    // Store only name + email (NO password)
    registeredEmails.push({ name, email });
    localStorage.setItem('medverify-registered-emails', JSON.stringify(registeredEmails));
    
    // Clean up legacy plain-text password storage from earlier demo versions
    localStorage.removeItem('medverify-registered-users');
    
    const userData = { name, email };
    setUser(userData);
    localStorage.setItem('medverify-user', JSON.stringify(userData));
    setIsLoading(false);
    return { success: true };
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('medverify-user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading,
      signIn, 
      signUp, 
      signOut 
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
