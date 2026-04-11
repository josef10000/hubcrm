import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  errorMsg: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const unsubscribe = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        
        if (u) {
          const profileRef = doc(db, 'profiles', u.uid);
          try {
            // Buscar perfil do usuário
            const profileSnap = await getDoc(profileRef);
            
            if (profileSnap.exists()) {
              const data = profileSnap.data() as UserProfile;
              
              // REGRA DE SUPER-ADMIN: Garante que o proprietário sempre seja Administrador em memória
              if (u.email === 'jfs102019@hotmail.com') {
                const updatedProfile = { ...data, role: 'Administrador' as const, orgId: data.orgId || u.uid };
                setUserProfile(updatedProfile);
              } else {
                setUserProfile(data);
              }
            } else {
              // --- BLOCO BOOTSTRAP / NOVO USUÁRIO ---
              
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
                  const newProfileSnap = await getDoc(profileRef);
                  if (newProfileSnap.exists()) {
                    setUserProfile(newProfileSnap.data() as UserProfile);
                    setLoading(false);
                    return;
                  }
                }
              }

              // 2. Se não houver convite, cria como NOVO ADMINISTRADOR (Padrão)
              const newProfile: UserProfile = {
                uid: u.uid,
                email: u.email || '',
                displayName: u.displayName || 'Usuário',
                orgId: u.uid,
                role: 'Administrador',
                createdAt: Date.now()
              };
              
              // Criar organização inicial
              const orgRef = doc(db, 'organizations', u.uid);
              const orgSnap = await getDoc(orgRef);
              if (!orgSnap.exists()) {
                await setDoc(orgRef, {
                  id: u.uid,
                  name: `Org ${u.displayName || u.email}`,
                  adminId: u.uid,
                  createdAt: Date.now()
                });
              }
              
              await setDoc(profileRef, newProfile);
              setUserProfile(newProfile);
            }
          } catch (err: any) {
            console.error("Critical Profile Error:", err);
            
            // FALLBACK DE EMERGÊNCIA: Se for o proprietário, permite entrar mesmo com erro de banco
            if (u.email === 'jfs102019@hotmail.com') {
              console.warn("Using Memory-based Emergency Profile for Owner.");
              const emergencyProfile = {
                uid: u.uid,
                email: u.email || '',
                displayName: u.displayName || 'Proprietário',
                orgId: u.uid,
                role: 'Administrador' as const,
                createdAt: Date.now()
              };
              setUserProfile(emergencyProfile);
              
              // Bootstrap em background: Tenta criar o perfil físico no banco agora que as regras permitem
              setDoc(profileRef, emergencyProfile, { merge: true }).catch(e => console.error("Bootstrap failed:", e));
            } else {
              // Para outros usuários, se falhar o carregamento do perfil, mas o Auth existir, 
              // não travamos o app, apenas deixamos sem perfil (o CRMContext lidará com isso)
              console.warn("Profile load failed, but continuing as basic authenticated user.");
              // Opcional: setErrorMsg se considerarmos que ninguém deve entrar sem perfil
              // Por enquanto, vamos ser permissivos para evitar o travamento relatado
              setLoading(false);
            }
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
        clearTimeout(timeoutId);
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
        unsubscribe();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error("Auth Init Error:", err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  }, []);

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

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, errorMsg, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
