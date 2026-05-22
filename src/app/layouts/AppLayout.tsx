import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@shared/components/Sidebar';
import { useUI } from '@/contexts/UIContext';
import { Header } from './Header';
import RadioPlayer from '@shared/components/RadioPlayer/RadioPlayer';

/**
 * AppLayout define a estrutura básica de navegação e conteúdo.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const navigate = useNavigate();

  const isStandaloneChat = pathname === '/chat' && window.location.search.includes('standalone=true');
  const isWiki = pathname === '/wiki';

  // Ocultar sidebar em telas de foco ou modos específicos
  const showSidebar = !isWiki && !isStandaloneChat;

  return (
    <>
      {showSidebar && <Sidebar />}

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        <Header currentPath={pathname} navigate={navigate} />
        
        <div className="flex-1 overflow-auto custom-scrollbar">
          {children}
        </div>
      </main>

      {/* Reprodutor de Rádio e Focus Station Global */}
      <RadioPlayer />

      {/* Mobile Overlay for Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-md" 
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
}
