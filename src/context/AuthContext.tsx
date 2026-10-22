import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';
import { Showroom } from '../types';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'CUSTOMER';
  showroomId: string;
  designation?: string;
  customerCode?: string;
  showroomName?: string;
}

interface AuthContextType {
  user: UserSession | null;
  token: string | null;
  activeShowroomId: string;
  showrooms: Showroom[];
  isLoading: boolean;
  login: (identifier: string, password?: string, role?: string) => Promise<void>;
  logout: () => void;
  setActiveShowroomId: (showroomId: string) => void;
  isEmployee: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default logged-in employee session backed by real database employee account
  const [user, setUser] = useState<UserSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeShowroomId, setActiveShowroomId] = useState<string>('');
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isCustomer = user?.role === 'CUSTOMER';

  useEffect(() => {
    if (token && !isCustomer) loadShowrooms();
    else setShowrooms([]);
  }, [token, isCustomer]);

  const loadShowrooms = async () => {
    try {
      const data = await api.getShowrooms();
      setShowrooms(data);
    } catch (err) {
      console.error('Failed to load showrooms', err);
    }
  };

  const login = async (identifier: string, password?: string, role?: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(identifier, password, role);
      setAuthToken(res.token);
      setUser(res.user);
      setToken(res.token);
      if (res.user.showroomId) {
        setActiveShowroomId(res.user.showroomId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setToken(null);
    setActiveShowroomId('');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeShowroomId,
        showrooms,
        isLoading,
        login,
        logout,
        setActiveShowroomId,
        isEmployee: user?.role === 'EMPLOYEE' || user?.role === 'ADMIN',
        isCustomer: user?.role === 'CUSTOMER'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
