import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useUI } from '@/contexts/UIContext';

// Layouts & Shell
import { AppLayout } from '../layouts/AppLayout';
import { WorkspaceShell } from '../shell/WorkspaceShell';
import { AuthGuard, PendingInviteGuard } from './RouteGuards';

// Eager Loaded Components (Core Views)
import DashboardView from '@crm/views/DashboardView';
import LeadsView from '@crm/views/LeadsView';
import SupportView from '@support/views/SupportView';
import ChatView from '@chat/views/ChatView';
import NotificationsView from '@core/notifications/views/NotificationsView';
import WikiView from '@wiki/views/WikiView';
import SettingsView from '@core/settings/views/SettingsView';
import ProfileView from '@core/profile/views/ProfileView';

// Shared / Infrastructure
import CalendarView from '@shared/components/CalendarView';
import ClientMapView from '@crm/components/ClientMapView';
import MonitoringView from '@crm/components/MonitoringView';

// Lazy Loaded Components (Heavier or specific views)
const AnalyticsView = lazy(() => import('@crm/views/AnalyticsView'));
const FinanceView = lazy(() => import('@finance/views/FinanceView'));
const BillingView = lazy(() => import('@finance/views/BillingView'));
const AdministrativeView = lazy(() => import('@core/admin/views/AdministrativeView'));
const MyWorkspaceView = lazy(() => import('@nexus/views/MyWorkspaceView'));
const ProjectsView = lazy(() => import('@crm/views/ProjectsView'));
const OnboardingHubView = lazy(() => import('@crm/views/OnboardingHubView'));
const ContractsView = lazy(() => import('@crm/views/ContractsView'));
const MarketingView = lazy(() => import('@crm/views/MarketingView'));
const ProductsView = lazy(() => import('@crm/views/ProductsView'));
const TeamManagementView = lazy(() => import('@people/views/TeamManagementView'));
const PeopleView = lazy(() => import('@people/views/PeopleView'));
const CanvasListView = lazy(() => import('@chat/views/CanvasListView'));
const CanvasEditorView = lazy(() => import('@chat/views/CanvasEditorView'));
const ReferralsView = lazy(() => import('@crm/components/ReferralsView'));
const AuditDashboard = lazy(() => import('@domains/core/views/AuditDashboard'));
const ReleaseNotesView = lazy(() => import('@domains/system/views/ReleaseNotesView'));

// Public / External Views
import ClientPortal from '@portal/components/ClientPortalLayout';
import OnboardingForm from '@auth/components/OnboardingForm';
import PublicCheckoutPage from '@finance/views/PublicCheckoutPage';
import AcceptInviteView from '@auth/views/AcceptInviteView';
import { GlobalModals } from '../shell/GlobalModals';
import { useAppTitle } from './useAppTitle';

export function AppRouter() {
  const { user, userProfile, isBirthday } = useAuth();
  const { clients, setEditingClient } = useCRM();
  const { isModalOpen, setIsModalOpen, setFocusMode } = useUI();
  const { hasPermission } = usePermissions();
  const location = useLocation();

  // Gerencia o título dinâmico da aba (notificações)
  useAppTitle();

  // Em modo standalone (nova aba do chat), forçar foco permanente
  useEffect(() => {
    const isStandaloneChat = new URLSearchParams(location.search).get('standalone') === 'true' && location.pathname === '/chat';
    if (isStandaloneChat) {
      setFocusMode(true);
    }
  }, [location.pathname, location.search, setFocusMode]);

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">Sincronizando Hub...</p>
        </div>
      </div>
    }>
      <Routes>
        {/* Public & External Routes */}
        <Route path="/portal/*" element={<ClientPortal />} />
        <Route path="/onboarding" element={<OnboardingForm />} />
        <Route path="/checkout/:id" element={<PublicCheckoutPage />} />
        <Route path="/invite/:id" element={<AcceptInviteView />} />

        {/* Private Workspace Routes */}
        <Route path="/*" element={
          <AuthGuard>
            <PendingInviteGuard>
              <WorkspaceShell isBirthday={isBirthday}>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardView />} />
                    <Route path="/leads" element={<LeadsView />} />
                    <Route path="/support" element={<SupportView />} />
                    <Route path="/chat" element={<ChatView />} />
                    <Route path="/notifications" element={<NotificationsView />} />
                    <Route path="/calendar" element={
                        <CalendarView 
                            role={typeof userProfile?.role === 'string' ? userProfile.role : userProfile?.role?.id} 
                            clients={clients} 
                            onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} 
                        />
                    } />
                    <Route path="/referrals" element={<ReferralsView clients={clients} user={user!} />} />
                    <Route path="/products" element={<ProductsView />} />
                    <Route path="/monitoring" element={<MonitoringView clients={clients} />} />
                    <Route path="/map" element={
                        <ClientMapView 
                            clients={clients} 
                            onClientClick={(client) => { setEditingClient(client); setIsModalOpen(true); }} 
                        />
                    } />
                    <Route path="/billing" element={<BillingView />} />
                    <Route path="/onboarding-hub" element={<OnboardingHubView />} />
                    <Route path="/contracts" element={<ContractsView />} />
                    <Route path="/projects" element={<ProjectsView />} />

                    {/* Permission Based Routes */}
                    <Route path="/analytics" element={hasPermission('VIEW_REPORTS') ? <AnalyticsView /> : <Navigate to="/" />} />
                    <Route path="/finance" element={hasPermission('MANAGE_FINANCE') ? <FinanceView /> : <Navigate to="/" />} />
                    <Route path="/marketing" element={hasPermission('MANAGE_SETTINGS') ? <MarketingView /> : <Navigate to="/" />} />
                    <Route path="/team" element={hasPermission('MANAGE_TEAM') ? <TeamManagementView /> : <Navigate to="/" />} />
                    <Route path="/people" element={hasPermission('MANAGE_TEAM') ? <PeopleView /> : <Navigate to="/" />} />
                    <Route path="/admin" element={hasPermission('MANAGE_SETTINGS') ? <AdministrativeView /> : <Navigate to="/" />} />
                    <Route path="/canvas" element={hasPermission('MANAGE_TEAM') || hasPermission('MANAGE_SETTINGS') ? <CanvasListView /> : <Navigate to="/" />} />
                    <Route path="/canvas/:id" element={hasPermission('MANAGE_TEAM') || hasPermission('MANAGE_SETTINGS') ? <CanvasEditorView /> : <Navigate to="/" />} />
                    
                    {/* General Workspace Routes */}
                    <Route path="/wiki" element={<WikiView />} />
                    <Route path="/settings" element={<SettingsView />} />
                    <Route path="/profile/:uid" element={<ProfileView />} />
                    <Route path="/workspace" element={<MyWorkspaceView />} />
                    <Route path="/release-notes" element={<ReleaseNotesView />} />
                    
                    {/* Security Based Route */}
                    <Route path="/compliance" element={hasPermission('MANAGE_SETTINGS') ? <AuditDashboard /> : <Navigate to="/" />} />
                    
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AppLayout>
                <GlobalModals />
              </WorkspaceShell>
            </PendingInviteGuard>
          </AuthGuard>
        } />
      </Routes>
    </Suspense>
  );
}
