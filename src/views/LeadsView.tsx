import React, { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { Lead, LeadStatus, LeadActivity } from '../types';
import { Users, Plus, Phone, Mail, DollarSign, Trash2, X, ChevronDown, TrendingUp, Target, UserPlus, ArrowRight, GripVertical, Search, Filter, Calendar, History, MessageSquare, PhoneCall, UserCircle, Send, Tag as TagIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const LEAD_COLUMNS: { status: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'Novo', label: 'Novo', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { status: 'Em Contato', label: 'Em Contato', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
  { status: 'Proposta Enviada', label: 'Proposta Enviada', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  { status: 'Negociação', label: 'Negociação', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  { status: 'Convertido', label: 'Convertido', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  { status: 'Perdido', label: 'Perdido', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
];

const LEAD_SOURCES = ['Indicação', 'Google Ads', 'Tráfego Orgânico', 'Prospecção Manual', 'Instagram', 'WhatsApp Direto', 'Parceiro'];

interface LeadFormData {
  name: string;
  whatsapp: string;
  email: string;
  leadSource: string;
  estimatedValue: string;
  notes: string;
  plan: string;
  niche: string;
  nextFollowUp: string;
  assignedTo: string;
  tagIds: string[];
}

const emptyForm: LeadFormData = { 
  name: '', whatsapp: '', email: '', leadSource: '', 
  estimatedValue: '', notes: '', plan: '', niche: '', 
  nextFollowUp: '', assignedTo: '',
  tagIds: []
};

export default function LeadsView() {
  const { user } = useAuth();
  const { leads, effectiveOrgId, userProfile, teamProfiles, tags } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<LeadFormData>(emptyForm);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [activeTab, setActiveTab] = useState<'form' | 'timeline'>('form');
  const [newActivityText, setNewActivityText] = useState('');
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [filterTag, setFilterTag] = useState('all');
  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchTerm || l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.whatsapp?.includes(searchTerm);
    const matchesSource = filterSource === 'all' || l.leadSource === filterSource;
    const matchesTag = filterTag === 'all' || l.tagIds?.includes(filterTag);
    return matchesSearch && matchesSource && matchesTag;
  });


  const handleSave = async () => {
    if (!user || !formData.name.trim()) { toast.error('Nome é obrigatório'); return; }
    try {
      const payload: any = {
        name: formData.name.trim(),
        whatsapp: formData.whatsapp.trim(),
        email: formData.email.trim() || undefined,
        leadSource: formData.leadSource || undefined,
        estimatedValue: formData.estimatedValue ? parseFloat(formData.estimatedValue) : undefined,
        notes: formData.notes.trim() || undefined,
        plan: formData.plan || undefined,
        niche: formData.niche.trim() || undefined,
        nextFollowUp: formData.nextFollowUp ? new Date(formData.nextFollowUp).getTime() : undefined,
        updatedAt: Date.now(),
        assignedTo: (userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') 
          ? (formData.assignedTo || user?.uid) 
          : (user?.uid),
        tagIds: formData.tagIds
      };
      // Clean undefined values
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      if (editingLead) {
        await updateDoc(doc(db, 'organizations', effectiveOrgId!, 'leads', editingLead.id), payload);
        toast.success('Lead atualizado!');
      } else {
        payload.status = 'Novo';
        payload.createdAt = Date.now();
        payload.activities = [{
          id: Math.random().toString(36).substring(2),
          type: 'status_change',
          text: 'Lead criado no sistema',
          date: Date.now(),
          userName: userProfile?.displayName || user?.email || 'Sistema'
        }];
        await addDoc(collection(db, 'organizations', effectiveOrgId!, 'leads'), payload);
        toast.success('Lead adicionado!');
      }
      closeModal();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!effectiveOrgId) return;
    if (userProfile?.role !== 'Administrador') {
      toast.error('Apenas administradores podem excluir leads.');
      return;
    }
    if (!confirm('Excluir este lead permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'leads', leadId));
      toast.success('Lead excluído');
      closeModal();
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
  };

  const handleDrop = async (targetStatus: LeadStatus) => {
    if (!draggedLead || !effectiveOrgId || draggedLead.status === targetStatus) { setDraggedLead(null); setDragOverColumn(null); return; }
    try {
      const newActivity: LeadActivity = {
        id: Math.random().toString(36).substring(2),
        type: 'status_change',
        text: `Manteve conversão: mudou para ${targetStatus}`,
        date: Date.now(),
        userName: userProfile?.displayName || user?.email || 'Sistema'
      };
      
      const updatedActivities = [...(draggedLead.activities || []), newActivity];

      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'leads', draggedLead.id), { 
        status: targetStatus, 
        updatedAt: Date.now(),
        activities: updatedActivities
      });
      toast.success(`Lead movido para ${targetStatus}`);
    } catch (e: any) { toast.error(`Erro: ${e.message}`); }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name, whatsapp: lead.whatsapp, email: lead.email || '',
      leadSource: lead.leadSource || '', estimatedValue: lead.estimatedValue?.toString() || '',
      notes: lead.notes || '', plan: lead.plan || '', niche: lead.niche || '',
      nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().split('T')[0] : '',
      assignedTo: lead.assignedTo || '',
      tagIds: lead.tagIds || []
    });
    setActiveTab('form');
    setIsModalOpen(true);
  };

  const handleAddActivity = async (type: LeadActivity['type']) => {
    if (!newActivityText.trim() || !editingLead || !effectiveOrgId) return;
    setIsSubmittingActivity(true);
    try {
      const activity: LeadActivity = {
        id: Math.random().toString(36).substring(2),
        type,
        text: newActivityText.trim(),
        date: Date.now(),
        userName: userProfile?.displayName || user?.email || 'Sistema'
      };
      const updatedActivities = [...(editingLead.activities || []), activity];
      await updateDoc(doc(db, 'organizations', effectiveOrgId, 'leads', editingLead.id), {
        activities: updatedActivities,
        updatedAt: Date.now()
      });
      setNewActivityText('');
      toast.success('Atividade registrada!');
    } catch (e: any) {
      toast.error('Erro ao registrar atividade.');
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  const handleCleanup = async () => {
    if (!effectiveOrgId || !leads.length) return;
    if (userProfile?.role !== 'Administrador') {
      toast.error('Apenas administradores podem realizar limpeza do banco.');
      return;
    }
    const validStatuses = LEAD_COLUMNS.map(c => c.status.toLowerCase());
    const ghostLeads = leads.filter(l => !l.status || !validStatuses.includes(l.status.toLowerCase()));
    
    if (ghostLeads.length === 0) {
      toast.info('Nenhum lead fantasma encontrado.');
      return;
    }

    if (!confirm(`Encotrados ${ghostLeads.length} leads fantasmas. Deseja excluí-los permanentemente?`)) return;

    try {
      const deletePromises = ghostLeads.map(l => deleteDoc(doc(db, 'organizations', effectiveOrgId, 'leads', l.id)));
      await Promise.all(deletePromises);
      toast.success(`${ghostLeads.length} leads fantasmas removidos!`);
    } catch (e: any) {
      toast.error(`Erro na limpeza: ${e.message}`);
    }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingLead(null); setFormData(emptyForm); };

  // ── Metrics ──
  const activeLeads = leads.filter(l => !['Convertido', 'Perdido'].includes(l.status || ''));
  const convertedLeads = leads.filter(l => l.status === 'Convertido');
  const conversionRate = leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) : '0';
  const totalPipelineValue = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const thisMonthLeads = leads.filter(l => {
    if (!l.createdAt) return false;
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            Pipeline de Vendas
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie seus leads e oportunidades de negócio</p>
        </div>
        <button
          onClick={() => { setFormData(emptyForm); setEditingLead(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-5 h-5" /> Novo Lead
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-blue-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Leads Ativos</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeLeads.length}</p>
          <button 
            onClick={handleCleanup}
            className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline font-medium"
          >
            Sincronizar Banco
          </button>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Taxa Conversão</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{conversionRate}%</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-amber-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Valor Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">R$ {totalPipelineValue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Novos (Mês)</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{thisMonthLeads.length}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 outline-none text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="all">Todas as Origens</option>
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative">
          <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer min-w-[180px]"
          >
            <option value="all">Todas as Tags</option>
            {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {LEAD_COLUMNS.map((col) => {
            const columnLeads = filteredLeads.filter(l => l.status?.toLowerCase() === col.status.toLowerCase());
            const isOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                className={`w-[280px] flex flex-col rounded-2xl border transition-all duration-200 ${isOver ? 'border-blue-500/50 bg-blue-500/5 scale-[1.01]' : 'border-white/10 bg-white/[0.02]'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(col.status); }}
              >
                {/* Column Header */}
                <div className={`px-4 py-3 border-b border-white/5 rounded-t-2xl`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bgColor} ${col.color}`}>
                      {columnLeads.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-420px)] custom-scrollbar">
                  {columnLeads.length === 0 && (
                    <div className="text-center py-8 text-gray-600 text-xs">
                      {isOver ? 'Soltar aqui' : 'Nenhum lead'}
                    </div>
                  )}
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLead(lead)}
                      onDragEnd={() => { setDraggedLead(null); setDragOverColumn(null); }}
                      onClick={() => openEditModal(lead)}
                      className={`p-3 bg-white/[0.04] border border-white/10 rounded-xl cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/[0.06] transition-all group ${draggedLead?.id === lead.id ? 'opacity-40 scale-95' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-white truncate">{lead.name}</h4>
                        <GripVertical className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-gray-400 transition-colors" />
                      </div>
                      {lead.whatsapp && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <Phone className="w-3 h-3" />
                          <span>{lead.whatsapp}</span>
                        </div>
                      )}
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        
                        {lead.tagIds && lead.tagIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tagIds.map(tagId => {
                              const tag = tags.find(t => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <div 
                                  key={tagId} 
                                  className="w-2 h-2 rounded-full shadow-sm"
                                  style={{ backgroundColor: tag.color }}
                                  title={tag.name}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {lead.nextFollowUp && (
                        <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          new Date(lead.nextFollowUp) < new Date() 
                          ? 'bg-red-500/20 text-red-500 border-red-500/30' 
                          : 'bg-blue-500/20 text-blue-500 border-blue-500/30'
                        }`}>
                          <Calendar size={12} />
                          <span>{format(new Date(lead.nextFollowUp), "dd 'de' MMM", { locale: ptBR })}</span>
                          {new Date(lead.nextFollowUp) < new Date() && <span className="uppercase ml-auto">Atrasado</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
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
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {activeTab === 'form' ? (
              <div className="space-y-4">
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

              {/* Lead Owner / Assignment */}
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Dono do Lead (Atribuição)</label>
                {(userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente') ? (
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select 
                      value={formData.assignedTo || user?.uid} 
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value={user?.uid}>Atribuído a mim</option>
                      {teamProfiles
                        .filter(p => p.role === 'SDR' || p.role === 'Executive')
                        .map(member => (
                          <option key={member.uid} value={member.uid}>
                            {member.displayName} ({member.role})
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
                            ? formData.tagIds.filter(id => id !== tag.id)
                            : [...formData.tagIds, tag.id];
                          setFormData({ ...formData, tagIds: newTags });
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected 
                            ? 'bg-primary-500/20 text-white border-primary-500' 
                            : 'bg-white/5 text-gray-500 border-white/10 hover:border-white/20'
                        }`}
                        style={isSelected ? { borderColor: tag.color, backgroundColor: tag.color + '20' } : {}}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                  {tags.length === 0 && (
                    <p className="text-[10px] text-gray-600 italic">Cadastre tags nas configurações para segmentar.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1.5">Observações</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm min-h-[80px] resize-none" placeholder="Anotações sobre o lead..." />
              </div>
            </div>

            ) : (
              <div className="flex flex-col h-[500px]">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 custom-scrollbar">
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

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
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
      )}
    </div>
  );
}
