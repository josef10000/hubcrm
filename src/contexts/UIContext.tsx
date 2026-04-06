import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteStatus } from '../types';

export type CRMView = 'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map' | 'leads';

interface UIContextType {
  // Navigation
  view: CRMView;
  setView: (view: CRMView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // View Modes
  dashboardMode: 'list' | 'kanban';
  setDashboardMode: (mode: 'list' | 'kanban') => void;

  // Search & Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: SiteStatus | 'Todos';
  setFilterStatus: (status: SiteStatus | 'Todos') => void;
  sortBy: 'recent' | 'alphabetical' | 'value';
  setSortBy: (sort: 'recent' | 'alphabetical' | 'value') => void;

  // Pagination
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  clientsPerPage: number;

  // Theme
  themeColor: string;
  setThemeColor: (color: string) => void;

  // Modals (Client)
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CRMView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'list' | 'kanban'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');

  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  
  const [themeColor, setThemeColor] = useState('#3b82f6'); // Base sync for settings

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy]);

  const value: UIContextType = {
    view, setView,
    sidebarOpen, setSidebarOpen,
    dashboardMode, setDashboardMode,
    isModalOpen, setIsModalOpen,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    sortBy, setSortBy,
    currentPage, setCurrentPage, clientsPerPage,
    themeColor, setThemeColor,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
