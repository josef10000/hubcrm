import React from 'react';
import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import ErrorBoundary from './components/common/ErrorBoundary';

/**
 * 🚀 Hub Central — Bootstrapper
 * 
 * O App.tsx agora é apenas o ponto de entrada limpo que orquestra
 * os Providers globais e o Roteador Principal.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
