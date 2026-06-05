import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCircle, History, PhoneCall, Users, ArrowRight, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Lead } from '@/types';
import { leadService } from '@/services/leadService';
import { 
  TextField, 
  Input, 
  TextArea, 
  Select, 
  ListBox, 
  Toolbar, 
  ToggleButtonGroup, 
  ToggleButton, 
  toast 
} from '@heroui/react';
import { Bold, Italic, Underline } from '@gravity-ui/icons';
import { usePermissions } from '@auth/hooks/usePermissions';

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
                <TextField isRequired className="w-full" name="name">
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Nome *</label>
                  <Input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                    placeholder="Nome do lead" 
                  />
                </TextField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <TextField className="w-full" name="whatsapp">
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">WhatsApp</label>
                    <Input 
                      type="text" 
                      value={formData.whatsapp} 
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                      placeholder="(00) 00000-0000" 
                    />
                  </TextField>
                </div>
                <div>
                  <TextField className="w-full" name="email">
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">E-mail</label>
                    <Input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                      placeholder="email@exemplo.com" 
                    />
                  </TextField>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Origem</label>
                  <Select 
                    placeholder="Selecionar..." 
                    value={formData.leadSource} 
                    onChange={(val) => setFormData({ ...formData, leadSource: val })}
                    className="w-full"
                  >
                    <Select.Trigger className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm flex justify-between items-center cursor-pointer">
                      <Select.Value>{formData.leadSource || 'Selecionar...'}</Select.Value>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="bg-neutral-900 border border-white/10 rounded-xl p-1 shadow-xl z-50">
                      <ListBox>
                        <ListBox.Item id="" textValue="Selecionar...">Selecionar...</ListBox.Item>
                        {LEAD_SOURCES.map(s => (
                          <ListBox.Item key={s} id={s} textValue={s}>{s}</ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <div>
                  <TextField className="w-full" name="estimatedValue">
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Valor Estimado</label>
                    <Input 
                      type="number" 
                      value={formData.estimatedValue} 
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                      placeholder="R$ 0,00" 
                    />
                  </TextField>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <TextField className="w-full" name="plan">
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Plano</label>
                    <Input 
                      type="text" 
                      value={formData.plan} 
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                      placeholder="Ex: Essencial" 
                    />
                  </TextField>
                </div>
                <div>
                  <TextField className="w-full" name="niche">
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Nicho</label>
                    <Input 
                      type="text" 
                      value={formData.niche} 
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                      placeholder="Ex: Restaurante" 
                    />
                  </TextField>
                </div>
              </div>
              <div>
                <TextField className="w-full" name="nextFollowUp">
                  <label className="block text-xs text-gray-400 font-medium mb-1.5">Próximo Contato (Follow-up)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                    <Input 
                      type="date" 
                      value={formData.nextFollowUp} 
                      onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm" 
                    />
                  </div>
                </TextField>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Dono do Lead (Atribuição)</label>
                {hasPermission('MANAGE_TEAM') ? (
                  <Select 
                    placeholder="Atribuído a mim" 
                    value={formData.assignedTo || user?.uid} 
                    onChange={(val) => setFormData({ ...formData, assignedTo: val })}
                    className="w-full"
                  >
                    <Select.Trigger className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm flex justify-between items-center cursor-pointer">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-gray-500" />
                        <Select.Value>
                          {teamProfiles.find(p => p.uid === (formData.assignedTo || user?.uid))?.displayName || 'Atribuído a mim'}
                        </Select.Value>
                      </div>
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover className="bg-neutral-900 border border-white/10 rounded-xl p-1 shadow-xl z-50">
                      <ListBox>
                        <ListBox.Item id={user?.uid} textValue="Atribuído a mim">Atribuído a mim</ListBox.Item>
                        {teamProfiles
                          .filter(p => {
                            const role = orgRoles.find(r => r.id === p.roleId || r.name === p.role);
                            return role ? role.permissions.includes('MANAGE_LEADS') : false;
                          })
                          .map(member => {
                            const roleName = orgRoles.find(r => r.id === member.roleId || r.name === member.role)?.name || member.role;
                            return (
                              <ListBox.Item key={member.uid} id={member.uid} textValue={member.displayName}>
                                {member.displayName} ({roleName})
                              </ListBox.Item>
                            );
                          })
                        }
                      </ListBox>
                    </Select.Popover>
                  </Select>
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
              <div className="flex flex-col gap-1.5">
                <label className="block text-xs text-gray-400 font-medium">Observações</label>
                <Toolbar isAttached aria-label="Editor de observações" className="bg-white/5 border border-white/10 rounded-t-xl px-2 py-1 flex gap-1 items-center">
                  <ToggleButtonGroup aria-label="Estilo do texto" selectionMode="multiple">
                    <ToggleButton isIconOnly aria-label="Negrito" id="bold" variant="light" className="text-gray-400 hover:text-white p-1 rounded">
                      <Bold className="w-4 h-4" />
                    </ToggleButton>
                    <ToggleButton isIconOnly aria-label="Itálico" id="italic" variant="light" className="text-gray-400 hover:text-white p-1 rounded">
                      <Italic className="w-4 h-4" />
                    </ToggleButton>
                    <ToggleButton isIconOnly aria-label="Sublinhado" id="underline" variant="light" className="text-gray-400 hover:text-white p-1 rounded">
                      <Underline className="w-4 h-4" />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Toolbar>
                <TextArea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-t-0 border-white/10 rounded-b-xl text-white outline-none text-sm min-h-[80px]" 
                  placeholder="Anotações sobre o lead..." 
                />
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
                <TextArea
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
