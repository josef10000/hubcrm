import { useAuth } from '@auth/contexts/AuthContext';
import { CustomRole, defaultRoles, AppPermission } from '@/constants/permissions';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ALL_PERMISSIONS: AppPermission[] = [
  'VIEW_DASHBOARD', 'MANAGE_LEADS', 'MANAGE_CLIENTS', 'MANAGE_FINANCE', 
  'MANAGE_TEAM', 'MANAGE_SETTINGS', 'MANAGE_WIKI', 'MANAGE_SUPPORT', 'VIEW_REPORTS'
];

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

      // 1. SUPER-ADMIN: O proprietário da plataforma SEMPRE tem todas as permissões
      if (userProfile.email === 'jfs102019@hotmail.com') {
        if (isMounted) {
          setCurrentPermissions(ALL_PERMISSIONS);
          setLoading(false);
        }
        return;
      }

      // 2. Verificar se é Administrador por roleId ou role object
      const roleId = userProfile.roleId;
      const roleObj = userProfile.role;
      const roleName = typeof roleObj === 'string' ? roleObj : roleObj?.name;
      const roleObjId = typeof roleObj === 'string' ? roleObj : roleObj?.id;

      const IS_ADMIN = 
        roleId === 'ROLE_ADMIN' || 
        roleObjId === 'ROLE_ADMIN' || 
        roleName === 'Administrador' ||
        (roleName && roleName.toLowerCase().includes('admin')) ||
        (roleId && roleId.toLowerCase().includes('admin')) ||
        (roleObjId && roleObjId.toLowerCase().includes('admin'));

      if (IS_ADMIN) { 
        if (isMounted) {
          setCurrentPermissions(ALL_PERMISSIONS);
          setLoading(false);
        }
        return;
      }

      // 3. Se as permissões já existem injetadas direto no perfil (caso seja um role customizado cacheado)
      if (userProfile.permissions && Array.isArray(userProfile.permissions) && userProfile.permissions.length > 0) {
         if (isMounted) {
            setCurrentPermissions(userProfile.permissions as AppPermission[]);
            setLoading(false);
         }
         return;
      }

      // 4. Se o role object já contém permissões (vindo do AuthContext como CustomRole)
      if (roleObj && typeof roleObj === 'object' && 'permissions' in roleObj && Array.isArray(roleObj.permissions) && roleObj.permissions.length > 0) {
        if (isMounted) {
          setCurrentPermissions(roleObj.permissions as AppPermission[]);
          setLoading(false);
        }
        return;
      }

      // 5. Checagem em defaults ou banco usando o roleId ou o legacy role
      const roleIdentifier = roleId || roleName || roleObjId;
      
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
         if (userProfile.orgId && roleId) {
             const roleRef = doc(db, `organizations/${userProfile.orgId}/roles`, roleId);
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
  }, [userProfile, userProfile?.role, userProfile?.roleId, userProfile?.permissions]);

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

