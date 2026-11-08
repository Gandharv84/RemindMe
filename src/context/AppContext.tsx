import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { DashboardStats, NotificationRecordChannel } from '../types';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface MessagePreviewData {
  isOpen: boolean;
  channel: NotificationRecordChannel;
  recipient: string;
  subject: string;
  message: string;
  deliveryNotes?: string;
}

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: DashboardStats | null;
  refreshStats: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  dismissToast: (id: string) => void;
  previewMessage: MessagePreviewData | null;
  openMessagePreview: (data: Omit<MessagePreviewData, 'isOpen'>) => void;
  closeMessagePreview: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeShowroomId, isCustomer } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [previewMessage, setPreviewMessage] = useState<MessagePreviewData | null>(null);

  // Switch to customer portal automatically when customer logs in
  useEffect(() => {
    if (isCustomer) {
      setActiveTab('customerPortal');
    } else if (activeTab === 'customerPortal') {
      setActiveTab('dashboard');
    }
  }, [isCustomer]);

  const refreshStats = useCallback(async () => {
    try {
      const data = await api.getStats(activeShowroomId);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    }
  }, [activeShowroomId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const openMessagePreview = (data: Omit<MessagePreviewData, 'isOpen'>) => {
    setPreviewMessage({ ...data, isOpen: true });
  };

  const closeMessagePreview = () => {
    setPreviewMessage(null);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        stats,
        refreshStats,
        toasts,
        showToast,
        dismissToast,
        previewMessage,
        openMessagePreview,
        closeMessagePreview
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
