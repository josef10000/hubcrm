import { useAuth } from '../contexts/AuthContext';
import { CustomRole, defaultRoles, AppPermission } from '../constants/permissions';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function usePermissions() {
  const { userProfile } = useAuth();
  const [currentPermissions, setCurrentPermissions] = useState<AppPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPermissions() {
      if (!userProfile) {
        if (isMounted) {
          setCurrentPermissions([]);
          setLoading(false);
        }
        return;
      }

      // 1. O proprietário (e-mail principal) tem TODAS as permissões automaticamente
      const IS_ADMIN_LEGACY = userProfile.role === 'Administrador';
      const IS_ADMIN_ID = userProfile.roleId === 'ROLE_ADMIN';

      if (IS_ADMIN_LEGACY || IS_ADMIN_ID) { 
         const allPerms: AppPermission[] = [
          'VIEW_DASHBOARD', 'MANAGE_LEADS', 'MANAGE_CLIENTS', 'MANAGE_FINANCE', 
          'MANAGE_TEAM', 'MANAGE_SETTINGS', 'MANAGE_WIKI', 'MANAGE_SUPPORT', 'VIEW_REPORTS'
        ];
        if (isMounted) {
          setCurrentPermissions(allPerms);
          setLoading(false);
        }
        return;
      }

      // 2. Se as permissões já existem injetadas direto no perfil (caso seja um role customizado cacheado)
      if (userProfile.permissions && Array.isArray(userProfile.permissions)) {
         if (isMounted) {
            setCurrentPermissions(userProfile.permissions as AppPermission[]);
            setLoading(false);
         }
         return;
      }

      // 3. Checagem em banco ou roles defaults usando o roleId ou o legacy role
      const roleIdentifier = userProfile.roleId || userProfile.role;
      
      try {
         // Tenta achar nos defaults primeiro (para migração lazy)
         const defaultRole = defaultRoles.find(r => r.name === roleIdentifier || r.id === roleIdentifier);
         if (defaultRole) {
            if (isMounted) {
              setCurrentPermissions(defaultRole.permissions);
              setLoading(false);
            }
            return;
         }

         // Não achou no default? Busca o role no banco (se roleId existir)
         if (userProfile.orgId && userProfile.roleId) {
             const roleRef = doc(db, `organizations/${userProfile.orgId}/roles`, userProfile.roleId);
             const roleSnap = await getDoc(roleRef);
             if (roleSnap.exists()) {
                 const data = roleSnap.data() as CustomRole;
                 if (isMounted) {
                    setCurrentPermissions(data.permissions);
                    setLoading(false);
                 }
                 return;
             }
         }
         
         // Fallback default: permissões mínimas se tudo falhar
         if (isMounted) {
            setCurrentPermissions(['VIEW_DASHBOARD']);
         }
      } catch (err) {
         console.warn("[usePermissions] Error loading custom roles", err);
         if (isMounted) setCurrentPermissions(['VIEW_DASHBOARD']);
      } finally {
         if (isMounted) setLoading(false);
      }
    }

    loadPermissions();

    return () => { isMounted = false; };
  }, [userProfile, userProfile?.role, userProfile?.roleId]);

  const hasPermission = (permission: AppPermission): boolean => {
    return currentPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: AppPermission[]): boolean => {
    return permissions.some(p => currentPermissions.includes(p));
  };

  const hasAllPermissions = (permissions: AppPermission[]): boolean => {
    return permissions.every(p => currentPermissions.includes(p));
  };

  return {
    permissions: currentPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoadingPermissions: loading
  };
}
