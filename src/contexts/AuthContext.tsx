import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, onSnapshot, or, and, writeBatch } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { defaultRoles } from '../constants/permissions';
import { UserProfile } from '../types';

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

import { BusinessAlert } from '../types';
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
                const dataProfile = { ...data, role: roleObj } as UserProfile;
              
              // Se mudou o roleId, precisamos de um novo listener pro cargo
              unsubscribeRole(); 
              if (data.roleId) {
                unsubscribeRole = onSnapshot(doc(db, 'organizations', data.orgId, 'roles', data.roleId), (roleSnap) => {
                   if (roleSnap.exists()) {
                      const roleData = roleSnap.data();
                      setUserProfile(prev => prev ? { ...prev, permissions: roleData.permissions } : null);
                   }
                });
              }
              
              // REGRA DE SUPER-ADMIN: Garante que o proprietário sempre seja Administrador em memória
              if (u.email === 'jfs102019@hotmail.com') {
                const orgIdToUse = data.orgId || u.uid;
                const adminRole = defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0];
                const updatedProfile = { ...data, role: adminRole, orgId: orgIdToUse };
                setUserProfile(updatedProfile);
                
                // Rotina de Inicialização Automática de Cargos (Bootstrap) para Novas Organizações
                try {
                  const rolesSnap = await getDocs(collection(db, 'organizations', orgIdToUse, 'roles'));
                  if (rolesSnap.empty) {
                    console.log("[Auth] Nenhuma role encontrada. Inicializando cargos padrão...");
                    const batch = writeBatch(db);
                    defaultRoles.forEach(roleData => {
                      const roleDocRef = doc(db, 'organizations', orgIdToUse, 'roles', roleData.id);
                      batch.set(roleDocRef, roleData);
                    });
                    await batch.commit();
                    console.log("[Auth] Cargos padrão inicializados com sucesso.");
                  }
                } catch (err) {
                  console.error("[Auth] Erro ao instanciar cargos:", err);
                }
              } else {
                // Se o usuário tem roleId mas não tem as permissões em cache, ou se mudou
                if (data.roleId && (!data.permissions || data.permissions.length === 0)) {
                   try {
                     const roleSnap = await getDoc(doc(db, 'organizations', data.orgId, 'roles', data.roleId));
                     if (roleSnap.exists()) {
                       const roleData = roleSnap.data();
                       const enrichedProfile = { ...data, permissions: roleData.permissions };
                       setUserProfile(enrichedProfile);
                       
                       // Opcional: Atualiza o cache no Firestore (Silencioso)
                       updateDoc(profileRef, { permissions: roleData.permissions }).catch(() => {});
                     } else {
                       setUserProfile(data);
                     }
                   } catch (err) {
                     console.error("[Auth] Erro ao buscar permissões do cargo:", err);
                     setUserProfile(data);
                   }
                } else {
                  setUserProfile(data);
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
                  console.log("[Auth] Convite detectado. Realizando auto-vínculo...");
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
                const newProfile: UserProfile = {
                  uid: u.uid,
                  email: u.email || '',
                  displayName: u.displayName || 'Usuário',
                  orgId: 'pending', 
                  role: readOnlyRole,
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
      const birthDate = new Date(userProfile.birthDate + 'T00:00:00');
      
      const isToday = 
        today.getDate() === birthDate.getDate() && 
        today.getMonth() === birthDate.getMonth();
      
      setIsBirthday(isToday);
      console.log(`[Auth] Verificação de aniversário: ${isToday ? '🎉 Hoje é seu dia!' : 'Não é hoje.'}`);
    } else {
      setIsBirthday(false);
    }
  }, [userProfile]);

  // Listener para Alertas de Negócio (RBAC)
  useEffect(() => {
    if (!userProfile?.role || !userProfile?.orgId) {
      setBusinessAlerts([]);
      setUnreadAlertsCount(0);
      return;
    }

    // Busca alertas disparados para a organização que tenham o cargo do usuário como alvo OU sejam para o usuário específico
    const q = query(
      collection(db, 'system_alerts'),
      and(
        where('orgId', '==', userProfile.orgId),
        or(
          where('targetRoles', 'array-contains', userProfile.role.id),
          where('userId', '==', userProfile.uid)
        )
      ),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedAlerts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as BusinessAlert))
        .sort((a, b) => b.createdAt - a.createdAt);

      setBusinessAlerts(loadedAlerts);

      // Calcula os não lidos comparando com o array readAlerts do perfil
      const unread = loadedAlerts.filter(alert => 
        !userProfile.readAlerts?.includes(alert.id)
      ).length;

      setUnreadAlertsCount(unread);
    }, (err) => {
      console.error("Alerts Listener Error:", err);
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
        // Garantir regra de super-admin
        if (user.email === 'jfs102019@hotmail.com') {
          const adminRole = defaultRoles.find(r => r.id === 'ROLE_ADMIN') || defaultRoles[0];
          setUserProfile({ ...data, role: adminRole, orgId: data.orgId || user.uid });
        } else {
          setUserProfile(data);
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
