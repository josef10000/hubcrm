import React, { useState } from 'react';
import { X, Search, MessageCircle, User } from 'lucide-react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export default function NewChatModal({ isOpen, onClose, onSelect }: NewChatModalProps) {
  const { teamProfiles, effectiveOrgId } = useCRM();
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const filteredTeam = teamProfiles.filter(p => 
    p.uid !== userProfile?.uid && 
    (p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartDM = async (otherUser: { uid: string; displayName: string }) => {
    if (!effectiveOrgId || !userProfile?.uid) return;

    setLoading(true);
    try {
      // 1. Verificar se já existe um chat Direct com essa pessoa
      const q = query(
        collection(db, 'organizations', effectiveOrgId, 'chats'),
        where('type', '==', 'direct'),
        where('members', 'array-contains', userProfile.uid)
      );

      const snapshot = await getDocs(q);
      const existingChat = snapshot.docs.find(doc => {
        const members = doc.data().members as string[];
        return members.includes(otherUser.uid);
      });

      if (existingChat) {
        onSelect(existingChat.id);
        onClose();
        return;
      }

      // 2. Se não existir, criar um novo
      const members = [userProfile.uid, otherUser.uid];
      const docRef = await addDoc(collection(db, 'organizations', effectiveOrgId, 'chats'), {
        name: otherUser.displayName, // Para DMs, o nome inicial pode ser o da outra pessoa
        type: 'direct',
        orgId: effectiveOrgId,
        members,
        adminIds: members,
        lastMessage: null,
        unreadCount: { [userProfile.uid]: 0, [otherUser.uid]: 0 },
        unreadMentions: { [userProfile.uid]: 0, [otherUser.uid]: 0 },
        lastRead: { [userProfile.uid]: serverTimestamp(), [otherUser.uid]: serverTimestamp() },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onSelect(docRef.id);
      onClose();
    } catch (error) {
      console.error("Erro ao iniciar DM:", error);
      toast.error('Erro ao iniciar conversa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Nova Conversa</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar pessoa por nome ou cargo..."
              className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 pl-10 pr-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:border-primary-500 transition-all dark:text-white"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto custom-scrollbar p-2">
          {filteredTeam.length === 0 ? (
            <div className="p-8 text-center opacity-40">
               <User size={32} className="mx-auto mb-2" />
               <p className="text-xs font-medium">Nenhum membro encontrado</p>
            </div>
          ) : (
            filteredTeam.map(member => (
              <button
                key={member.uid}
                disabled={loading}
                onClick={() => handleStartDM(member)}
                className="w-full flex items-center gap-3 p-3 hover:bg-primary-500 hover:text-white rounded-2xl transition-all group border-b border-gray-50 dark:border-white/5 last:border-0"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden border border-gray-200 dark:border-white/10 group-hover:bg-white/20 group-hover:border-transparent transition-all">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold group-hover:text-white uppercase">
                      {member.displayName[0]}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold block leading-none mb-1 group-hover:text-white">{member.displayName}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-tighter group-hover:text-white/70">
                    {member.jobTitle || 'Membro da Equipe'}
                  </span>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageCircle size={18} />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 text-center">
           <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Inicie uma conversa 1:1 segura</p>
        </div>
      </div>
    </div>
  );
}
