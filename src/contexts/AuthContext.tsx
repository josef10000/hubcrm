import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit, onSnapshot, or, and } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
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
              const data = snap.data() as UserProfile;
              
              // REGRA DE SUPER-ADMIN: Garante que o proprietário sempre seja Administrador em memória
              if (u.email === 'jfs102019@hotmail.com') {
                const updatedProfile = { ...data, role: 'Administrador' as const, orgId: data.orgId || u.uid };
                setUserProfile(updatedProfile);
              } else {
                setUserProfile(data);
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
                const newProfile: UserProfile = {
                  uid: u.uid,
                  email: u.email || '',
                  displayName: u.displayName || 'Usuário',
                  orgId: 'pending', 
                  role: 'Só Leitura',
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
                    role: 'Administrador' as const,
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
              setUserProfile({
                uid: u.uid,
                email: u.email || '',
                displayName: 'Proprietário (Fallback)',
                orgId: u.uid,
                role: 'Administrador',
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
          where('targetRoles', 'array-contains', userProfile.role),
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
          setUserProfile({ ...data, role: 'Administrador', orgId: data.orgId || user.uid });
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
