import React, { useState } from 'react';
import { X, Users, Search, Check, Info } from 'lucide-react';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (chatId: string) => void;
}

export default function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const { teamProfiles, effectiveOrgId } = useCRM();
  const { userProfile } = useAuth();
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const filteredTeam = teamProfiles.filter(p => 
    p.uid !== userProfile?.uid && 
    (p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Dê um nome ao grupo!');
    if (selectedMembers.length === 0) return toast.error('Selecione pelo menos um membro!');
    if (!effectiveOrgId || !userProfile?.uid) return;

    setLoading(true);
    try {
      const members = [userProfile.uid, ...selectedMembers];
      const docRef = await addDoc(collection(db, 'organizations', effectiveOrgId, 'chats'), {
        name: name.trim(),
        type: 'group',
        orgId: effectiveOrgId,
        members,
        adminIds: [userProfile.uid],
        lastMessage: null,
        unreadCount: members.reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {}),
        unreadMentions: members.reduce((acc, uid) => ({ ...acc, [uid]: 0 }), {}),
        lastRead: members.reduce((acc, uid) => ({ ...acc, [uid]: serverTimestamp() }), {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Grupo criado com sucesso!');
      onSuccess(docRef.id);
      onClose();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast.error('Erro ao criar o grupo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Novo Grupo</h2>
              <p className="text-xs text-gray-500 font-medium">Crie um espaço de colaboração para sua equipe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Nome do Grupo */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome do Grupo</label>
            <input 
              type="text" 
              placeholder="Ex: Equipe de Vendas, Projeto X..."
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Seleção de Membros */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Selecionar Membros ({selectedMembers.length})</label>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-9 pr-3 py-1.5 rounded-xl text-[11px] focus:outline-none focus:border-primary-500 transition-all dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {filteredTeam.map((member) => {
                const isSelected = selectedMembers.includes(member.uid);
                return (
                  <button
                    key={member.uid}
                    onClick={() => toggleMember(member.uid)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                      isSelected 
                        ? 'bg-primary-500/10 border-primary-500/30' 
                        : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 overflow-hidden border border-gray-100 dark:border-white/10">
                        {member.photoURL ? <img src={member.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{member.displayName[0]}</div>}
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 dark:text-white block leading-none mb-1">{member.displayName}</span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{member.jobTitle || 'Membro'}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-primary-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20 animate-in zoom-in">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 dark:bg-white/5 flex items-center justify-between border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 text-gray-500">
            <Info size={14} />
            <span className="text-[10px] font-medium italic">Você será o administrador do grupo</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancelar</button>
            <button 
              disabled={loading || !name.trim() || selectedMembers.length === 0}
              onClick={handleCreate}
              className="px-8 py-3 bg-primary-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-primary-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
