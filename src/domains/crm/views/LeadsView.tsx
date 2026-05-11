import React, { useState } from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { Lead, LeadStatus } from '@/types';
import { Plus, DollarSign, Target, UserPlus, Search, TrendingUp, Users } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { LeadCard } from '@crm/components/leads/LeadCard';
import { LeadFormModal } from '@crm/components/leads/LeadFormModal';

const LEAD_COLUMNS: { status: LeadStatus; label: string; color: string; bgColor: string }[] = [
  { status: 'Novo', label: 'Novo', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  { status: 'Em Contato', label: 'Em Contato', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/20' },
  { status: 'Negociação', label: 'Negociação', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  { status: 'Convertido', label: 'Convertido', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  { status: 'Perdido', label: 'Perdido', color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20' },
];

const LEAD_SOURCES = ['Indicação', 'Google Ads', 'Tráfego Orgânico', 'Prospecção Manual', 'Instagram', 'WhatsApp Direto', 'Parceiro'];

const emptyForm = { 
  name: '', whatsapp: '', email: '', leadSource: '', 
  estimatedValue: '', notes: '', plan: '', niche: '', 
  nextFollowUp: '', assignedTo: '',
  tagIds: []
};

export default function LeadsView() {
  const { user } = useAuth();
  const {
    leads,
    stats,
    tags,
    teamProfiles,
    userProfile,
    searchTerm,
    setSearchTerm,
    filterSource,
    setFilterSource,
    filterTag,
    setFilterTag,
    leadFilter,
    setLeadFilter,
    handleSaveLead,
    handleMoveLead,
    handleDeleteLead,
    handleCleanup,
    orgRoles
  } = useLeads();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  
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
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const success = await handleSaveLead(formData, editingLead);
    if (success) {
      setIsModalOpen(false);
      setEditingLead(null);
      setFormData(emptyForm);
    }
  };

  const onDrop = async (status: LeadStatus) => {
    if (draggedLead && draggedLead.status !== status) {
      await handleMoveLead(draggedLead, status);
    }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

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
        <div className="flex gap-2">
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
             <button 
                onClick={() => setLeadFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${leadFilter === 'all' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
             >
                Todos
             </button>
             <button 
                onClick={() => setLeadFilter('mine')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${leadFilter === 'mine' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
             >
                Minhas Oportunidades
             </button>
          </div>
          <button
            onClick={() => { setFormData(emptyForm); setEditingLead(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" /> Novo Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Leads Ativos</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeCount}</p>
          <button onClick={handleCleanup} className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 underline font-medium">Sincronizar Banco</button>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Taxa Conversão</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{stats.conversionRate}%</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Valor Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">R$ {stats.totalPipelineValue.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Novos (Mês)</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.thisMonthCount}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none text-sm"
          />
        </div>
        <select
          value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none text-sm cursor-pointer min-w-[180px]"
        >
          <option value="all">Todas as Origens</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none text-sm cursor-pointer min-w-[180px]"
        >
          <option value="all">Todas as Tags</option>
          {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {LEAD_COLUMNS.map((col) => {
            const columnLeads = leads.filter(l => l.status?.toLowerCase() === col.status.toLowerCase());
            const isOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                className={`w-[280px] flex flex-col rounded-2xl border transition-all ${isOver ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 bg-white/[0.02]'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.status); }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => { e.preventDefault(); onDrop(col.status); }}
              >
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bgColor} ${col.color}`}>{columnLeads.length}</span>
                </div>
                <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-420px)] custom-scrollbar">
                  {columnLeads.map((lead) => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead} 
                      isDragged={draggedLead?.id === lead.id}
                      tags={tags}
                      onDragStart={setDraggedLead}
                      onDragEnd={() => { setDraggedLead(null); setDragOverColumn(null); }}
                      onClick={openEditModal}
                    />
                  ))}
                  {columnLeads.length === 0 && <div className="text-center py-8 text-gray-600 text-xs">Nenhum lead</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LeadFormModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingLead(null); }}
        editingLead={editingLead}
        formData={formData}
        setFormData={setFormData}
        tags={tags}
        teamProfiles={teamProfiles}
        userProfile={userProfile}
        user={user}
        effectiveOrgId={(userProfile as any)?.orgId || ''}
        onSave={handleSave}
        orgRoles={orgRoles}
      />
    </div>
  );
}

