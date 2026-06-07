import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, onSnapshot, or, and, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { defaultRoles } from '@/constants/permissions';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  errorMsg: string | null;
  refreshProfile: () => Promise<void>;
  isBirthday: boolean;
  businessAlerts: BusinessAlert[];
  unreadAlertsCount: number;
  markAlertAsRead: (alertId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

import { BusinessAlert } from '@/types';
import { updateDoc, arrayUnion } from 'firebase/firestore';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBirthday, setIsBirthday] = useState(false);
  const [businessAlerts, setBusinessAlerts] = useState<BusinessAlert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let unsubscribeProfile: () => void = () => { };
    let unsubscribeRole: () => void = () => { };
    
    try {
      const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
        // Limpa listener anterior
        unsubscribeProfile();
        setUser(u);
        
        if (u) {
          const profileRef = doc(db, 'profiles', u.uid);
          
          // Inicia escuta em tempo real do perfil
          unsubscribeProfile = onSnapshot(profileRef, async (snap) => {
              if (snap.exists()) {
                const data = snap.data();
                // Converte role legado (string) para objeto se necessário
                let roleObj = data.role;
                if (typeof data.role === 'string') {
                  roleObj = defaultRoles.find(r => r.id === data.role || r.name === data.role) || defaultRoles[0];
                }
                const dataProfile = { 
                  ...data, 
                  uid: snap.id,
                  photoURL: data.photoURL || u.photoURL || '',
                  displayName: data.displayName || u.displayName || 'Colaborador',
                  role: roleObj 
                } as UserProfile;
              
              // Se mudou o roleId, precisamos de um novo listener pro cargo
              unsubscribeRole(); 
              if (dataProfile.roleId) {
                unsubscribeRole = onSnapshot(doc(db, 'organizations', dataProfile.orgId, 'roles', dataProfile.roleId), (roleSnap) => {
                   if (roleSnap.exists()) {
                      const roleData = roleSnap.data();
                      setUserProfile(prev => prev ? { ...prev, permissions: roleData.permissions } : null);
                   }
                });
              }
              
              // REGRA DE SUPER-ADMIN: Garante que o proprietário sempre tenha Administrador em memória
              if (u.email === 'jfs102019@hotmail.com') {
                // Para o dono único, o orgId correto é o seu próprio UID (onde os dados estão salvos)
                const orgIdToUse = (dataProfile.orgId && dataProfile.orgId !== 'pending') ? dataProfile.orgId : u.uid;
                const adminRole = defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0];
                const updatedProfile: UserProfile = { ...dataProfile, role: adminRole, orgId: orgIdToUse };
                setUserProfile(updatedProfile);
                
                // AUTO-CORREÇÃO NO BANCO: Se o orgId no Firestore estiver 'pending', atualizamos para o ID real
                if (dataProfile.orgId === 'pending') {
                  updateDoc(profileRef, { 
                    orgId: u.uid,
                    displayName: dataProfile.displayName || 'Proprietário'
                  }).catch(err => console.error("[Auth] Erro ao auto-corrigir perfil:", err));
                }
                
                // Rotina de Inicialização Automática de Cargos (Bootstrap) para Novas Organizações
                try {
                  const rolesSnap = await getDocs(collection(db, 'organizations', orgIdToUse, 'roles'));
                  if (rolesSnap.empty) {
                    const batch = writeBatch(db);
                    defaultRoles.forEach(roleData => {
                      const roleDocRef = doc(db, 'organizations', orgIdToUse, 'roles', roleData.id);
                      batch.set(roleDocRef, roleData);
                    });
                    await batch.commit();
                    await batch.commit();
                  }
                } catch (err) {
                  console.error("[Auth] Erro ao instanciar cargos:", err);
                }
              } else {
                // Se o usuário tem roleId mas não tem as permissões em cache, ou se mudou
                if (dataProfile.roleId && (!dataProfile.permissions || dataProfile.permissions.length === 0)) {
                   try {
                     const roleSnap = await getDoc(doc(db, 'organizations', dataProfile.orgId, 'roles', dataProfile.roleId));
                     if (roleSnap.exists()) {
                       const roleData = roleSnap.data();
                       const enrichedProfile: UserProfile = { ...dataProfile, permissions: roleData.permissions };
                       setUserProfile(enrichedProfile);
                       
                       // Opcional: Atualiza o cache no Firestore (Silencioso)
                       updateDoc(profileRef, { permissions: roleData.permissions }).catch(() => {});
                     } else {
                       setUserProfile(dataProfile);
                     }
                   } catch (err) {
                     console.error("[Auth] Erro ao buscar permissões do cargo:", err);
                     setUserProfile(dataProfile);
                   }
                } else {
                  setUserProfile(dataProfile);
                }
              }
              setLoading(false);
              clearTimeout(timeoutId);
            } else {
              // --- BLOCO BOOTSTRAP / NOVO USUÁRIO ---
              // (Mantemos a lógica original de convite e criação de perfil pendente)
              try {
                // 1. Verificar se existe convite pendente para este e-mail
                const invitesRef = query(collection(db, 'convites'), 
                  where('email', '==', u.email), 
                  where('status', '==', 'pending'),
                  limit(1)
                );
                
                const inviteSnap = await getDocs(invitesRef);
                
                if (!inviteSnap.empty) {
                  const idToken = await u.getIdToken();
                  const acceptRes = await fetch('/api/team/accept', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${idToken}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({}) // Sem token, a API usa o e-mail
                  });
                  
                  if (acceptRes.ok) {
                    // O onSnapshot lidará com o novo documento assim que for criado pela API
                    return;
                  }
                }

                // 2. Se não houver convite, entra em modo AGUARDANDO CONVITE
                const readOnlyRole = defaultRoles.find(r => r.id === 'ROLE_READONLY') || defaultRoles[6] || defaultRoles[defaultRoles.length - 1];
                
                // EXCEÇÃO PARA PROPRIETÁRIO NO BOOTSTRAP
                const isOwner = u.email === 'jfs102019@hotmail.com';
                const orgIdToUse = isOwner ? u.uid : 'pending';
                const roleToUse = isOwner ? (defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0]) : readOnlyRole;

                const newProfile: UserProfile = {
                  uid: u.uid,
                  email: u.email || '',
                  displayName: u.displayName || (isOwner ? 'Proprietário' : 'Usuário'),
                  orgId: orgIdToUse, 
                  role: roleToUse,
                  createdAt: Date.now()
                };
                
                await setDoc(profileRef, newProfile);
                // O setDoc fará o onSnapshot disparar novamente
              } catch (err) {
                console.error("Bootstrap Error:", err);
                
                if (u.email === 'jfs102019@hotmail.com') {
                  const emergencyProfile = {
                    uid: u.uid,
                    email: u.email || '',
                    displayName: u.displayName || 'Proprietário',
                    orgId: u.uid,
                    role: defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0],
                    createdAt: Date.now()
                  };
                  setUserProfile(emergencyProfile);
                  setDoc(profileRef, emergencyProfile, { merge: true }).catch(console.error);
                }
              }
            }
          }, (err: any) => {
            console.error("Profile Listener Error:", err);
            // Fallback owner
            if (u.email === 'jfs102019@hotmail.com') {
              const adminRole = defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0];
              setUserProfile({
                uid: u.uid,
                email: u.email || '',
                displayName: 'Proprietário (Fallback)',
                orgId: u.uid,
                role: adminRole,
                createdAt: Date.now()
              });
            }
            setLoading(false);
          });
        } else {
          setUserProfile(null);
          setIsBirthday(false);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }, (error) => {
        console.error("Auth Error:", error);
        setErrorMsg(error.message);
        setLoading(false);
        clearTimeout(timeoutId);
      });

      timeoutId = setTimeout(() => {
        setLoading(false);
        setErrorMsg("O tempo limite de autenticação foi excedido.");
      }, 15000);

      return () => {
        unsubscribeAuth();
        unsubscribeProfile();
        unsubscribeRole();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error("Auth Init Error:", err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  }, []);

  // Verificar se hoje é aniversário
  useEffect(() => {
    if (userProfile?.birthDate) {
      const today = new Date();
      const dateStr = userProfile.birthDate;
      
      let day: number = 0;
      let month: number = 0;

      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length >= 2) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
        }
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length >= 3) {
          // YYYY-MM-DD
          day = parseInt(parts[2], 10);
          month = parseInt(parts[1], 10) - 1;
        } else if (parts.length === 2) {
          // MM-DD
          day = parseInt(parts[1], 10);
          month = parseInt(parts[0], 10) - 1;
        }
      }

      const isBday = day !== 0 && today.getDate() === day && today.getMonth() === month;
      
      setIsBirthday(isBday);
    } else {
      setIsBirthday(false);
    }
  }, [userProfile]);

  // Listener para Alertas de Negócio (RBAC)
  useEffect(() => {
    if (!userProfile?.role || !userProfile?.orgId || userProfile.orgId === 'pending') {
      setBusinessAlerts([]);
      setUnreadAlertsCount(0);
      return;
    }
    
    // Simplificamos a query para evitar problemas de permissão complexos ou falta de índices
    const q = query(
      collection(db, 'system_alerts'),
      where('orgId', '==', userProfile.orgId),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAlerts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BusinessAlert));
      
      // Filtragem em memória (RBAC) com tratamento de tipagem robusto
      const userRoleId = typeof userProfile.role === 'string' ? userProfile.role : (userProfile.role?.id || '');
      const filteredAlerts = allAlerts.filter(alert => {
        const targetRoles = alert.targetRoles || [];
        const hasRole = targetRoles.some(r => 
          (typeof r === 'string' && r === userRoleId) || 
          (typeof r === 'object' && r !== null && (r as any).id === userRoleId)
        );
        const isForUser = alert.userId === userProfile.uid;
        const isGlobal = targetRoles.length === 0 && !alert.userId;
        
        return hasRole || isForUser || isGlobal;
      }).sort((a, b) => b.createdAt - a.createdAt);

      setBusinessAlerts(filteredAlerts);

      // Calcula os não lidos
      const unread = filteredAlerts.filter(alert => 
        !userProfile.readAlerts?.includes(alert.id)
      ).length;

      setUnreadAlertsCount(unread);
    }, (err) => {
      console.warn("[Auth] Alertas do sistema (RBAC) indisponíveis ou erro de permissão:", err.message);
      setBusinessAlerts([]);
      setUnreadAlertsCount(0);
    });

    return () => unsubscribe();
  }, [userProfile?.role, userProfile?.readAlerts, userProfile?.orgId]);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const data = profileSnap.data() as UserProfile;
        const dataProfile: UserProfile = {
          ...data,
          uid: profileSnap.id,
          photoURL: data.photoURL || user.photoURL || '',
          displayName: data.displayName || user.displayName || 'Colaborador'
        };
        // Garantir regra de super-admin
        if (user.email === 'jfs102019@hotmail.com') {
          const adminRole = defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0];
          const orgIdToUse = (data.orgId && data.orgId !== 'pending') ? data.orgId : user.uid;
          setUserProfile({ ...dataProfile, email: user.email || data.email, role: adminRole, orgId: orgIdToUse });
          
          if (data.orgId === 'pending') {
            updateDoc(profileRef, { orgId: user.uid }).catch(() => {});
          }
        } else {
          setUserProfile(dataProfile);
        }
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const markAlertAsRead = async (alertId: string) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        readAlerts: arrayUnion(alertId)
      });
    } catch (err) {
      console.error("Error marking alert as read:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      errorMsg, 
      refreshProfile, 
      isBirthday,
      businessAlerts,
      unreadAlertsCount,
      markAlertAsRead
    }}>
      {children}
    </AuthContext.Provider>
  );
}
