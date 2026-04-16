import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteStatus } from '../types';

export type CRMView = 'dashboard' | 'analytics' | 'support' | 'finance' | 'settings' | 'calendar' | 'referrals' | 'marketing' | 'products' | 'monitoring' | 'map' | 'leads';

interface UIContextType {
  // Navigation
  view: CRMView;
  setView: (view: CRMView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;


  // Search & Filters
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: SiteStatus | 'Todos';
  setFilterStatus: (status: SiteStatus | 'Todos') => void;
  sortBy: 'recent' | 'alphabetical' | 'value';
  setSortBy: (sort: 'recent' | 'alphabetical' | 'value') => void;
  filterTagId: string;
  setFilterTagId: (tagId: string) => void;

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');
  const [filterTagId, setFilterTagId] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 9;
  
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('hubcrm-theme') || 'orange');

  // Aplicar tema dinamicamente
  useEffect(() => {
    const root = document.documentElement;
    // Remover classes de tema anteriores
    const themeClasses = Array.from(root.classList).filter(c => c.startsWith('theme-'));
    themeClasses.forEach(c => root.classList.remove(c));
    
    // Adicionar nova classe de tema
    root.classList.add(`theme-${themeColor}`);
    
    // Persistir preferência
    localStorage.setItem('hubcrm-theme', themeColor);
  }, [themeColor]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, filterTagId]);

  const value: UIContextType = {
    view, setView,
    sidebarOpen, setSidebarOpen,
    isModalOpen, setIsModalOpen,
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    sortBy, setSortBy,
    filterTagId, setFilterTagId,
    currentPage, setCurrentPage, clientsPerPage,
    themeColor, setThemeColor,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
