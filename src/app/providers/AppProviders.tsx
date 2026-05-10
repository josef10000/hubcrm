import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@auth/contexts/AuthContext';
import { UIProvider } from '@/contexts/UIContext';
import { CRMProvider } from '@crm/contexts/CRMContext';
import { DialogProvider } from '@auth/contexts/DialogContext';
import { isFirebaseConfigured } from '@/lib/firebase';
import { AlertTriangle } from 'lucide-react';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BrowserRouter>
      {!isFirebaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 text-center font-bold shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={20} />
            <span>Firebase não configurado! Adicione as chaves no painel.</span>
          </div>
        </div>
      )}
      <Toaster position="top-right" theme="dark" />
      <Analytics />
      <DialogProvider>
        <AuthProvider>
          <UIProvider>
            <CRMProvider>
              {children}
            </CRMProvider>
          </UIProvider>
        </AuthProvider>
      </DialogProvider>
    </BrowserRouter>
  );
}
