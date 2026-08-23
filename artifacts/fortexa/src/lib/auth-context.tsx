import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGetMe } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('fortexa_token')
  );
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ['me', token],
    }
  });

  useEffect(() => {
    if (error && token) {
      // Token is invalid, clear it
      localStorage.removeItem('fortexa_token');
      setToken(null);
      setAuthenticatedUser(null);
    }
  }, [error, token]);

  const setAuth = (newUser: User, newToken: string) => {
    localStorage.setItem('fortexa_token', newToken);
    setAuthenticatedUser(newUser);
    setToken(newToken);
  };

  const clearAuth = () => {
    localStorage.removeItem('fortexa_token');
    setAuthenticatedUser(null);
    setToken(null);
  };

  const currentUser = authenticatedUser ?? user ?? null;

  return (
    <AuthContext.Provider value={{ user: currentUser, token, isLoading, setAuth, clearAuth }}>
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
