import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  errorMsg: string | null;
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
          try {
            // Buscar perfil do usuário
            const profileRef = doc(db, 'profiles', u.uid);
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
              // BOOTSTRAP: Criar perfil inicial e organização (Migração)
              const newProfile: UserProfile = {
                uid: u.uid,
                email: u.email || '',
                displayName: u.displayName || 'Administrador',
                orgId: u.uid, // Por enquanto usamos o UID como OrgId padrão na migração
                role: 'Administrador',
                createdAt: Date.now()
              };
              
              // Criar organização se não existir
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

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, errorMsg }}>
      {children}
    </AuthContext.Provider>
  );
}
