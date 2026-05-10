import { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { useGlobalChatAlerts } from '@/hooks/useGlobalChatAlerts';

/**
 * useAppTitle gerencia o título dinâmico da aba do navegador.
 * Inclui contadores de notificações, tickets abertos e novos artigos da Wiki.
 */
export function useAppTitle() {
  const { userProfile, unreadAlertsCount } = useAuth();
  const { supportRequests, wikiArticles, pendingVacationsCount } = useCRM();
  const { hasPermission } = usePermissions();
  const { totalUnread: chatUnreadCount } = useGlobalChatAlerts();
  const location = useLocation();

  const openTicketCount = useMemo(() => 
    (supportRequests || []).filter(r => r.status === 'aberto' || r.status === 'em_analise').length, 
    [supportRequests]
  );

  const newWikiCount = useMemo(() => {
    return (wikiArticles || []).filter(art => !userProfile?.viewedWikiArticles?.includes(art.id)).length;
  }, [wikiArticles, userProfile?.viewedWikiArticles]);

  const titleCount = useMemo(() => {
    const isManagement = hasPermission('MANAGE_TEAM');
    return (unreadAlertsCount || 0) + openTicketCount + (isManagement ? (pendingVacationsCount || 0) : 0) + newWikiCount + (chatUnreadCount || 0);
  }, [unreadAlertsCount, openTicketCount, pendingVacationsCount, newWikiCount, chatUnreadCount, hasPermission]);

  useEffect(() => {
    const prefix = titleCount > 0 ? `(${titleCount}) ` : '';
    const currentPath = location.pathname;

    if (currentPath === '/chat') {
      document.title = `${prefix}Chat — Hub Central`;
    } else if (currentPath === '/wiki') {
      document.title = `${prefix}Wiki Hub`;
    } else {
      document.title = `${prefix}Hub Central`;
    }
  }, [titleCount, location.pathname]);
}
