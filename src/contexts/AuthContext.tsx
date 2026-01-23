import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface AppUser {
  id: string;
  login: string;
  full_name: string;
  is_admin: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('app_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('app_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (login: string, password: string) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ login, password }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Błąd logowania');
    }

    const appUser: AppUser = result.user;
    const token = result.token;

    setUser(appUser);
    localStorage.setItem('app_user', JSON.stringify(appUser));
    localStorage.setItem('app_token', token);
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
