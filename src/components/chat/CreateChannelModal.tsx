import React, { useState } from 'react';
import { X, Hash, Lock, Globe, Camera, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { toast } from 'sonner';
import { uploadImageToImgBB } from '../../lib/imgbb';
import { useChatStore } from '@store/useChatStore';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (channelId: string) => void;
}

const CHANNEL_ICONS = ['📢', '💬', '💰', '☕', '🎯', '📊', '🛠️', '🎉', '📋', '👥', '🏢', '❤️', '🔔', '📌', '🚀'];

const CHANNEL_CATEGORIES = [
  { id: 'geral', label: 'Geral', color: 'bg-blue-500' },
  { id: 'vendas', label: 'Vendas', color: 'bg-emerald-500' },
  { id: 'rh', label: 'RH & Pessoas', color: 'bg-amber-500' },
  { id: 'financeiro', label: 'Financeiro', color: 'bg-violet-500' },
  { id: 'suporte', label: 'Suporte', color: 'bg-rose-500' },
  { id: 'social', label: 'Social', color: 'bg-pink-500' },
  { id: 'anuncios', label: 'Anúncios', color: 'bg-red-500' },
];

export default function CreateChannelModal({ isOpen, onClose, onSuccess }: CreateChannelModalProps) {
  const { userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📢');
  const [category, setCategory] = useState('geral');
  const [isPublic, setIsPublic] = useState(true);
  const [isRequired, setIsRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return toast.error('Dê um nome ao canal!');
    if (!effectiveOrgId || !userProfile?.uid) return;

    const createChannel = useChatStore.getState().createChannel;

    setLoading(true);
    try {
      const channelId = await createChannel(effectiveOrgId, {
        name: name.trim(),
        members: [userProfile.uid],
        adminIds: [userProfile.uid],
        avatarUrl: avatarUrl || null,
        isPublic,
        isRequired,
        category,
        description: description.trim(),
        icon,
        unreadCount: { [userProfile.uid]: 0 },
        unreadMentions: { [userProfile.uid]: 0 },
      });

      toast.success(`Canal #${name} criado!`);
      onClose();
      onSuccess?.(channelId);
      setName('');
      setDescription('');
      setIcon('📢');
      setCategory('geral');
      setIsPublic(true);
      setIsRequired(false);
      setAvatarUrl(null);
    } catch (error) {
      console.error("Erro ao criar canal:", error);
      toast.error("Erro ao criar canal.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Máximo 2MB');

    setUploadingAvatar(true);
    try {
      const url = await uploadImageToImgBB(file);
      setAvatarUrl(url);
      toast.success('Ícone carregado!');
    } catch { toast.error('Erro ao carregar ícone.'); }
    finally { setUploadingAvatar(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[2rem] border border-gray-100 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 fade-in duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-950 p-6 pb-4 border-b border-gray-100 dark:border-white/5 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-500/20">
              <Hash size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Criar Canal</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sala temática</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nome do Canal</label>
            <div className="flex items-center gap-2">
              <span className="text-xl text-gray-400">#</span>
              <input 
                type="text" 
                placeholder="ex: vendas-anuncios"
                className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-violet-500 transition-all dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-à-ú]/g, ''))}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Descrição (Opcional)</label>
            <textarea 
              placeholder="Do que se trata este canal..."
              rows={2}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-violet-500 transition-all dark:text-white resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Ícone Emoji */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_ICONS.map(e => (
                <button
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    icon === e ? 'bg-violet-500/20 border-2 border-violet-500 scale-110 shadow-lg shadow-violet-500/20' : 'bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:scale-105'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar Custom (Opcional) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Imagem Custom (Opcional)</label>
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl">
              <div className="relative w-14 h-14">
                <div className="w-full h-full bg-gray-200 dark:bg-white/10 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-white/10">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{icon}</span>
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-violet-500 text-white rounded-lg flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                  <Camera size={12} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 flex-1">Substitui o emoji por uma imagem personalizada.</p>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    category === cat.id 
                      ? `${cat.color} text-white shadow-lg` 
                      : 'bg-gray-50 dark:bg-white/5 text-gray-500 border border-gray-100 dark:border-white/10 hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visibilidade */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Visibilidade</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsPublic(true)}
                className={`p-4 rounded-2xl border transition-all text-left ${
                  isPublic ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Globe size={20} className={isPublic ? 'text-violet-500 mb-2' : 'text-gray-400 mb-2'} />
                <span className="text-xs font-black block text-gray-900 dark:text-white">Público</span>
                <span className="text-[10px] text-gray-400">Todos podem ver e entrar</span>
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`p-4 rounded-2xl border transition-all text-left ${
                  !isPublic ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Lock size={20} className={!isPublic ? 'text-violet-500 mb-2' : 'text-gray-400 mb-2'} />
                <span className="text-xs font-black block text-gray-900 dark:text-white">Privado</span>
                <span className="text-[10px] text-gray-400">Apenas por convite</span>
              </button>
            </div>
          </div>

          {/* Canal Obrigatório */}
          {isPublic && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
              <div>
                <span className="text-xs font-black text-gray-900 dark:text-white block">Canal Obrigatório</span>
                <span className="text-[10px] text-gray-400">Novos membros entram automaticamente</span>
              </div>
              <button 
                onClick={() => setIsRequired(!isRequired)}
                className={`w-12 h-6 rounded-full transition-all relative ${isRequired ? 'bg-violet-500' : 'bg-gray-300 dark:bg-white/10'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${isRequired ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 pt-4 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Cancelar</button>
          <button 
            disabled={loading || !name.trim() || uploadingAvatar}
            onClick={handleCreate}
            className="px-8 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-violet-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : `Criar #${name || 'canal'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
