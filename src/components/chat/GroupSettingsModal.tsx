import React, { useState } from 'react';
import { X, Users, Edit3, Trash2, Shield, UserMinus, Plus } from 'lucide-react';
import { Chat } from '../../types/chat.types';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDialog } from '../../contexts/DialogContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
}

export default function GroupSettingsModal({ isOpen, onClose, chat }: GroupSettingsModalProps) {
  const { teamProfiles, effectiveOrgId } = useCRM();
  const { userProfile } = useAuth();
  const { confirm } = useDialog();
  const [name, setName] = useState(chat.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isAdmin = chat.adminIds.includes(userProfile?.uid || '');
  const chatMembers = teamProfiles.filter(p => chat.members.includes(p.uid));

  const handleUpdateName = async () => {
    if (!name.trim() || name === chat.name) return setIsEditingName(false);
    if (!effectiveOrgId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id), {
        name: name.trim()
      });
      toast.success('Nome do grupo atualizado!');
      setIsEditingName(false);
    } catch (error) {
      toast.error('Erro ao atualizar nome.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!effectiveOrgId || !isAdmin) return;
    if (memberId === userProfile?.uid) return toast.error('Você não pode se remover! Use Sair do Grupo.');

    setLoading(true);
    try {
      const newMembers = chat.members.filter(id => id !== memberId);
      const newAdmins = chat.adminIds.filter(id => id !== memberId);
      
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id), {
        members: newMembers,
        adminIds: newAdmins
      });
      toast.success('Membro removido.');
    } catch (error) {
      toast.error('Erro ao remover membro.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    const ok = await confirm({
      title: 'Excluir Grupo',
      message: 'Tem certeza que deseja EXCLUIR este grupo para TODOS? Esta ação é irreversível.',
      confirmText: 'Sim, excluir permanentemente',
      variant: 'danger'
    });
    if (!ok) return;
    if (!effectiveOrgId || !isAdmin) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id));
      toast.success('Grupo excluído.');
      onClose();
    } catch (error) {
      toast.error('Erro ao excluir grupo.');
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
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Dados do Grupo</h2>
              <p className="text-xs text-gray-500 font-medium">{chat.members.length} Participantes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Nome do Grupo</label>
              {isAdmin && !isEditingName && (
                <button onClick={() => setIsEditingName(true)} className="text-primary-500 hover:text-primary-600">
                   <Edit3 size={14} />
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-gray-50 dark:bg-white/5 border border-primary-500 p-3 rounded-xl text-sm focus:outline-none dark:text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <button 
                  onClick={handleUpdateName}
                  className="px-4 py-2 bg-primary-500 text-white text-xs font-bold rounded-xl"
                >
                  OK
                </button>
              </div>
            ) : (
              <p className="text-lg font-bold text-gray-900 dark:text-white">{chat.name}</p>
            )}
          </div>

          {/* Lista de Membros */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Membros</label>
            <div className="space-y-2">
              {chatMembers.map((member) => {
                const isMemberAdmin = chat.adminIds.includes(member.uid);
                return (
                  <div key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 overflow-hidden border border-gray-100 dark:border-white/10">
                        {member.photoURL ? <img src={member.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{member.displayName[0]}</div>}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block leading-none mb-1">{member.displayName}</span>
                        <div className="flex items-center gap-2">
                          {isMemberAdmin && <span className="text-[8px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1"><Shield size={8} /> Admin</span>}
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">{member.jobTitle || 'Membro'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isAdmin && member.uid !== userProfile?.uid && (
                      <button 
                        onClick={() => handleRemoveMember(member.uid)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover do Grupo"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ações de Admin */}
          {isAdmin && (
            <div className="pt-6 border-t border-gray-100 dark:border-white/5 space-y-3">
              <button 
                onClick={handleDeleteGroup}
                className="w-full flex items-center justify-center gap-2 p-4 text-red-500 hover:bg-red-500/10 rounded-2xl border border-red-500/20 transition-all font-bold text-sm"
              >
                <Trash2 size={18} />
                Excluir Grupo Permanente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
