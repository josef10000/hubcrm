import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCircle, ChevronDown, History, PhoneCall, Users, ArrowRight, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Lead } from '@/types';
import { leadService } from '../../services/leadService';
import { toast } from 'sonner';
import { usePermissions } from '@auth/hooks/usePermissions';
import { defaultRoles } from '@/constants/permissions';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLead: Lead | null;
  formData: any;
  setFormData: (data: any) => void;
  tags: any[];
  teamProfiles: any[];
  userProfile: any;
  user: any;
  effectiveOrgId: string;
  onSave: () => void;
  orgRoles?: any[];
}

const LEAD_SOURCES = ['Indicação', 'Google Ads', 'Tráfego Orgânico', 'Prospecção Manual', 'Instagram', 'WhatsApp Direto', 'Parceiro'];

export function LeadFormModal({ 
  isOpen, onClose, editingLead, formData, setFormData, tags, teamProfiles, userProfile, user, effectiveOrgId, onSave, orgRoles = []
}: LeadFormModalProps) {
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState<'form' | 'timeline'>('form');
  const [newActivityText, setNewActivityText] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);

  useEffect(() => {
    if (isOpen) setActiveTab('form');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddActivity = async (type: any) => {
    if (!newActivityText.trim() || !editingLead || !effectiveOrgId) return;
    setIsSubmittingActivity(true);
    try {
      const activity: any = {
        id: Math.random().toString(36).substring(2),
        type,
        text: newActivityText.trim(),
        date: Date.now(),
        userName: userProfile?.displayName || user?.email || 'Sistema'
      };
      await leadService.addActivity(effectiveOrgId, editingLead.id, activity, editingLead.activities || []);
      setNewActivityText('');
      toast.success('Atividade registrada!');
    } catch (e: any) {
      toast.error('Erro ao registrar atividade.');
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('form')}
              className={`text-lg font-bold transition-colors ${activeTab === 'form' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {editingLead ? 'Editar Lead' : 'Novo Lead'}
            </button>
            {editingLead && (
              <button
                onClick={() => setActiveTab('timeline')}
                className={`text-lg font-bold transition-colors flex items-center gap-2 ${activeTab === 'timeline' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Linha do Tempo
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{editingLead.activities?.length || 0}</span>
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {activeTab === 'form' ? (
            <div className="space-y-4 pb-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Nome *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="Nome do lead" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">WhatsApp</label>
                  <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">E-mail</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Origem</label>
                  <select value={formData.leadSource} onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer">
                    <option value="">Selecionar...</option>
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Valor Estimado</label>
                  <input type="number" value={formData.estimatedValue} onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="R$ 0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Plano</label>
                  <input type="text" value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="Ex: Essencial" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Nicho</label>
                  <input type="text" value={formData.niche} onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" placeholder="Ex: Restaurante" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Próximo Contato (Follow-up)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="date" value={formData.nextFollowUp} onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Dono do Lead (Atribuição)</label>
                {hasPermission('MANAGE_TEAM') ? (
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select 
                      value={formData.assignedTo || user?.uid} 
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value={user?.uid}>Atribuído a mim</option>
                      {teamProfiles
                        .filter(p => {
                          const role = orgRoles.find(r => r.id === p.roleId || r.name === p.role);
                          return role ? role.permissions.includes('MANAGE_LEADS') : false;
                        })
                        .map(member => (
                          <option key={member.uid} value={member.uid}>
                            {member.displayName} ({orgRoles.find(r => r.id === member.roleId || r.name === member.role)?.name || member.role})
                          </option>
                        ))
                      }
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-dashed border-white/10 rounded-xl opacity-80">
                    <UserCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">Atribuído automaticamente a você</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Tags / Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const isSelected = formData.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const newTags = isSelected
                            ? formData.tagIds.filter((id: string) => id !== tag.id)
                            : [...formData.tagIds, tag.id];
                          setFormData({ ...formData, tagIds: newTags });
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'text-white' 
                            : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
                        }`}
                        style={isSelected ? { borderColor: tag.color, backgroundColor: tag.color + '20' } : {}}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Observações</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm min-h-[80px] resize-none" placeholder="Anotações sobre o lead..." />
              </div>
              
              <button
                onClick={onSave}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                {editingLead ? 'Atualizar Lead' : 'Criar Lead'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-black/40 rounded-2xl p-4">
              <div className="flex-1 space-y-4 mb-4">
                {(!editingLead?.activities || editingLead.activities.length === 0) ? (
                  <div className="text-center py-12 text-gray-600">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma atividade registrada ainda.</p>
                  </div>
                ) : (
                  [...(editingLead.activities || [])].reverse().map((activity) => (
                    <div key={activity.id} className="relative pl-8 pb-4 border-l border-white/5 last:pb-0">
                      <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-blue-500" />
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {activity.type === 'call' && <PhoneCall className="w-3 h-3 text-blue-400" />}
                            {activity.type === 'meeting' && <Users className="w-3 h-3 text-purple-400" />}
                            {activity.type === 'status_change' && <ArrowRight className="w-3 h-3 text-emerald-400" />}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activity.userName}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">{format(activity.date, "dd/MM HH:mm")}</span>
                        </div>
                        <p className="text-sm text-gray-300">{activity.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shrink-0">
                <textarea
                  value={newActivityText}
                  onChange={(e) => setNewActivityText(e.target.value)}
                  placeholder="Registrar nova interação..."
                  className="w-full bg-transparent text-sm text-white border-none outline-none resize-none mb-3 min-h-[60px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => handleAddActivity('note')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" title="Anotação"><MessageSquare size={16} /></button>
                    <button onClick={() => handleAddActivity('call')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" title="Ligação"><PhoneCall size={16} /></button>
                    <button onClick={() => handleAddActivity('meeting')} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors" title="Reunião"><Users size={16} /></button>
                  </div>
                  <button
                    onClick={() => handleAddActivity('note')}
                    disabled={!newActivityText.trim() || isSubmittingActivity}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
                  >
                    <Send size={14} /> Registrar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
