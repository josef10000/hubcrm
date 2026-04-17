import React, { useState, useEffect } from 'react';
import { X, Save, Lock, Eye, Globe, Shield, User } from 'lucide-react';
import { WikiArticle, WikiCategory, UserRole } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import RichTextEditor from '../RichTextEditor';

interface WikiEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WikiArticle | null;
}

const CATEGORIES: WikiCategory[] = ['RH', 'Vendas', 'Técnico', 'Atendimento', 'Suporte', 'Geral'];
const ROLES: UserRole[] = [
  'Administrador', 'Gerente', 'People & Culture', 'Customer Success', 
  'Suporte Técnico', 'Onboarding Specialist', 'SDR', 'Executive', 
  'FinOps', 'Controladoria', 'Revenue Operations', 'Gestor de Faturamento', 'Só Leitura'
];

export default function WikiEditorModal({ isOpen, onClose, initialData }: WikiEditorModalProps) {
  const { handleSaveWikiArticle, teamProfiles } = useCRM();
  const { userProfile } = useAuth();
  
  const [formData, setFormData] = useState<Partial<WikiArticle>>({
    title: '',
    content: '',
    categories: ['Geral'],
    allowedRoles: [],
    allowedUserIds: [],
    isPopular: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        content: '',
        categories: ['Geral'],
        allowedRoles: [],
        allowedUserIds: [],
        isPopular: false
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    await handleSaveWikiArticle({
      ...formData,
      authorId: userProfile?.uid || '',
      authorName: userProfile?.displayName || 'Desconhecido'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-5xl bg-gray-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/20 rounded-2xl">
              <Shield className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {initialData ? 'Editar Artigo' : 'Novo Artigo na Wiki'}
              </h2>
              <p className="text-sm text-gray-400">Crie conhecimento compartilhado para a equipe</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Título do Artigo</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Guia de Onboarding para Novos SDRs"
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Conteúdo do Artigo</label>
                <RichTextEditor
                  value={formData.content || ''}
                  onChange={val => setFormData({ ...formData, content: val })}
                  placeholder="Escreva o conteúdo detalhado aqui..."
                />
              </div>
            </div>

            {/* Sidebar Config */}
            <div className="space-y-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Configurações Gerais
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-3 uppercase tracking-widest">Temas do Artigo</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/20 p-3 rounded-2xl border border-white/5">
                    {CATEGORIES.map(cat => (
                      <label key={cat} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/5">
                        <input
                          type="checkbox"
                          checked={formData.categories?.includes(cat)}
                          onChange={e => {
                            const current = formData.categories || [];
                            setFormData({
                              ...formData,
                              categories: e.target.checked 
                                ? [...current, cat]
                                : current.filter(c => c !== cat)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary-500 focus:ring-primary-500 transition-all"
                        />
                        <span className="text-xs font-medium text-gray-300">{cat}</span>
                      </label>
                    ))}
                  </div>
                  {(!formData.categories || formData.categories.length === 0) && (
                    <p className="mt-2 text-[10px] text-orange-500/70 italic flex items-center gap-1">
                      ⚠️ Selecione pelo menos um tema.
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={e => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-white/10 bg-black/40 text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white">Destaque</span>
                    <p className="text-xs text-gray-500">Exibir na seção de populares</p>
                  </div>
                </label>
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Controle de Acesso
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Por Cargos</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                    {ROLES.map(role => (
                      <label key={role} className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={formData.allowedRoles?.includes(role)}
                          onChange={e => {
                            const roles = formData.allowedRoles || [];
                            setFormData({
                              ...formData,
                              allowedRoles: e.target.checked 
                                ? [...roles, role]
                                : roles.filter(r => r !== role)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary-500"
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Por Usuários Específicos</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2">
                    {teamProfiles.map(profile => (
                      <label key={profile.uid} className="flex items-center gap-2 text-sm text-gray-300">
                        <input
                          type="checkbox"
                          checked={formData.allowedUserIds?.includes(profile.uid)}
                          onChange={e => {
                            const users = formData.allowedUserIds || [];
                            setFormData({
                              ...formData,
                              allowedUserIds: e.target.checked 
                                ? [...users, profile.uid]
                                : users.filter(id => id !== profile.uid)
                            });
                          }}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary-500"
                        />
                        {profile.displayName}
                      </label>
                    ))}
                  </div>
                </div>
                
                <p className="text-[10px] text-gray-500 italic">
                  * Se nenhum for selecionado, o artigo será visível para todos.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/10 flex items-center justify-end gap-3 bg-white/5">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-white rounded-2xl transition-all font-semibold shadow-xl shadow-primary-500/20 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Salvar Artigo
          </button>
        </div>
      </div>
    </div>
  );
}
