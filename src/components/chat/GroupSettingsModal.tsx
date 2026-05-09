import React, { useState } from 'react';
import { X, Users, Edit3, Trash2, Shield, UserMinus, Plus, Camera, Loader2, Search } from 'lucide-react';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { Chat } from '../../types/chat.types';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveOrgId || !isAdmin) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error('A imagem deve ter no máximo 2MB');
    }

    setUploadingAvatar(true);
    try {
      const url = await uploadImageToImgBB(file);
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id), {
        avatarUrl: url
      });
      toast.success('Ícone do grupo atualizado!');
    } catch (error) {
      console.error("Erro ao carregar ícone:", error);
      toast.error('Erro ao carregar ícone.');
    } finally {
      setUploadingAvatar(false);
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

  const handleAddMember = async (memberId: string) => {
    if (!effectiveOrgId || !isAdmin) return;

    setLoading(true);
    try {
      const newMembers = [...chat.members, memberId];
      
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'chats', chat.id), {
        members: newMembers,
        [`unreadCount.${memberId}`]: 0,
        [`unreadMentions.${memberId}`]: 0,
        [`lastRead.${memberId}`]: serverTimestamp()
      });
      toast.success('Membro adicionado!');
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      toast.error('Erro ao adicionar membro.');
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
            <div className="relative group">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20 overflow-hidden">
                {chat.avatarUrl ? (
                  <img src={chat.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={24} />
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 size={16} className="text-white animate-spin" />
                  </div>
                )}
              </div>
              {isAdmin && (
                <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-zinc-800 text-primary-500 rounded-lg flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all border border-gray-100 dark:border-white/10">
                  <Camera size={10} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              )}
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
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Membros</label>
              {isAdmin && (
                <button 
                  onClick={() => setIsAddingMember(!isAddingMember)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isAddingMember ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white'
                  }`}
                >
                  {isAddingMember ? <X size={12} /> : <Plus size={12} />}
                  {isAddingMember ? 'Fechar' : 'Adicionar'}
                </button>
              )}
            </div>

            {isAddingMember && (
              <div className="space-y-3 p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10 animate-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Buscar membro para adicionar..."
                    className="w-full bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:border-primary-500 dark:text-white"
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                  {teamProfiles
                    .filter(p => !chat.members.includes(p.uid) && p.displayName.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.uid}
                        onClick={() => handleAddMember(p.uid)}
                        className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden border border-gray-100 dark:border-white/10">
                            {p.photoURL ? <img src={p.photoURL} alt="" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">{p.displayName[0]}</div>}
                          </div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{p.displayName}</span>
                        </div>
                        <Plus size={14} className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                </div>
              </div>
            )}

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
