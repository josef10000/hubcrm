import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LiquidGlassDock from '@shared/components/LiquidGlassDock';
import { Header } from './Header';
import RadioPlayer from '@shared/components/RadioPlayer/RadioPlayer';

/**
 * AppLayout define a estrutura full-width de comando com Dock Liquid Glass inferior.
 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isStandaloneChat =
    pathname === '/chat' && window.location.search.includes('standalone=true');
  const isDashboard = pathname === '/';

  return (
    <>
      <main className="flex-1 flex flex-col h-screen w-full overflow-hidden relative z-20">
        {!isStandaloneChat && <Header currentPath={pathname} navigate={navigate} />}

        <div
          className={`flex-1 overflow-auto custom-scrollbar ${
            !isStandaloneChat && !isDashboard ? 'pb-24' : ''
          }`}
        >
          {children}
        </div>
      </main>

      {/* Dock Inferior Única Liquid Glass (Solopreneur + Squad IA) */}
      {!isStandaloneChat && <LiquidGlassDock />}

      {/* Reprodutor de Rádio e Focus Station Integrado à Dock */}
      <RadioPlayer />
    </>
  );
}
