import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Plus, X, DollarSign, CheckCircle, Clock, 
  MapPin, Phone, Tag, Menu, Building2, FileText, Briefcase, AlignLeft,
  Search, BarChart3, Calendar, Paperclip, Copy, MessageCircle, Trash2, Snowflake, LogOut, Globe
} from 'lucide-react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import Auth from './components/Auth';

type PlanType = 'Padrão' | 'Profissional';
type SiteStatus = 'Em Desenvolvimento' | 'Ativo' | 'Cancelado';

interface Client {
  id: string; 
  name: string; 
  whatsapp: string; 
  plan: PlanType;
  siteLink?: string;
  status: SiteStatus;
  createdAt: number;
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function ClientModal({ isOpen, onClose, onSave, onDelete, initialData }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Client>) => void, onDelete?: (id: string) => void, initialData: Client | null }) {
  const [formData, setFormData] = useState<Partial<Client>>({ plan: 'Padrão', status: 'Em Desenvolvimento' });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ plan: 'Padrão', status: 'Em Desenvolvimento' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'whatsapp') {
      // Auto-format whatsapp: (99) 99999-9999
      let v = value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      if (v.length > 10) v = `${v.substring(0, 10)}-${v.substring(10)}`;
      setFormData(prev => ({ ...prev, [name]: v }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-lg flex flex-col border border-white/20 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold text-white">{initialData ? 'Detalhes do Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Cliente/Empresa *</label>
              <input required type="text" name="name" value={formData.name || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: João Silva" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp *</label>
              <input required type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} placeholder="(11) 99999-9999" className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plano *</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, plan: 'Padrão' }))}
                  className={`p-4 rounded-xl border text-left transition-all ${formData.plan === 'Padrão' ? 'bg-orange-500/20 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  <div className="font-semibold mb-1">Padrão</div>
                  <div className="text-sm opacity-80">R$ 80/mês</div>
                </button>
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, plan: 'Profissional' }))}
                  className={`p-4 rounded-xl border text-left transition-all ${formData.plan === 'Profissional' ? 'bg-orange-500/20 border-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  <div className="font-semibold mb-1">Profissional</div>
                  <div className="text-sm opacity-80">R$ 120/mês</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select name="status" value={formData.status || 'Em Desenvolvimento'} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none">
                <option value="Em Desenvolvimento" className="bg-gray-900">🟡 Em Desenvolvimento</option>
                <option value="Ativo" className="bg-gray-900">🟢 Ativo</option>
                <option value="Cancelado" className="bg-gray-900">🔴 Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Link do Site (Opcional)</label>
              <input type="url" name="siteLink" value={formData.siteLink || ''} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            {initialData && onDelete ? (
              <button type="button" onClick={() => onDelete(initialData.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-2 rounded-lg transition-colors flex items-center">
                <Trash2 size={18} className="mr-2" /> Excluir
              </button>
            ) : <div></div>}
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95">Salvar Cliente</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CRM({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    const leadsRef = collection(db, 'users', user.uid, 'leads');
    const unsubscribe = onSnapshot(leadsRef, (snapshot) => {
      const loadedLeads: Lead[] = [];
      snapshot.forEach((doc) => {
        loadedLeads.push(doc.data() as Lead);
      });
      setLeads(loadedLeads);
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching leads:", error);
      alert(`Erro ao carregar dados do banco: ${error.message}\n\nVerifique se o Firestore Database foi criado no painel do Firebase e se as Regras (Rules) permitem leitura/escrita.`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSaveLead = async (leadData: Partial<Lead>) => {
    const isNew = !leadData.id;

    const lead: Lead = {
      id: leadData.id || crypto.randomUUID(),
      companyName: leadData.companyName || '', niche: leadData.niche || '',
      whatsapp: leadData.whatsapp || '', googleMapsLink: leadData.googleMapsLink || '',
      origin: leadData.origin as Origin || 'Prospecção', indicatorName: leadData.indicatorName, indicatorPix: leadData.indicatorPix,
      commercialStatus: leadData.commercialStatus || 'Prospecção (Frios)', operationStatus: leadData.operationStatus,
      indicationPaymentStatus: leadData.indicationPaymentStatus, createdAt: leadData.createdAt || Date.now(),
      serviceType: leadData.serviceType, dealValue: leadData.dealValue, isRecurring: leadData.isRecurring, clientData: leadData.clientData, notes: leadData.notes, deliveryLink: leadData.deliveryLink,
      nextContactDate: leadData.nextContactDate, history: leadData.history || [], files: leadData.files || []
    };

    // Remove undefined values as Firestore does not support them
    const cleanLead = Object.fromEntries(Object.entries(lead).filter(([_, v]) => v !== undefined));

    setIsModalOpen(false); setEditingLead(null);
    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', lead.id), cleanLead);
    } catch (error: any) { 
      console.error("Save Error:", error);
      alert(`Erro ao salvar cliente: ${error.message}\n\nVerifique se o Firestore Database está ativado no seu projeto Firebase.`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    setIsModalOpen(false);
    setEditingLead(null);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'leads', leadId));
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const handleMoveLead = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    let updates: Partial<Lead> = {};
    let actionText = '';

    if (funnel === 'commercial') {
      if (lead.commercialStatus === newStatus) return;
      updates.commercialStatus = newStatus as CommercialStatus;
      actionText = `Movido para ${newStatus}`;
      if (newStatus === 'Ganho' && lead.commercialStatus !== 'Ganho') {
        if (!lead.operationStatus) updates.operationStatus = 'Aguardar Dados';
        if (lead.origin === 'Indicação' && !lead.indicationPaymentStatus) updates.indicationPaymentStatus = 'Pendente';
      }
    } else {
      if (lead.operationStatus === newStatus) return;
      updates.operationStatus = newStatus as OperationStatus;
      actionText = `Operação movida para ${newStatus}`;
    }

    updates.history = [...lead.history, { date: Date.now(), action: actionText }];
    
    const updatedLead = { ...lead, ...updates };
    const cleanLead = Object.fromEntries(Object.entries(updatedLead).filter(([_, v]) => v !== undefined));

    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', leadId), cleanLead);
    } catch (error: any) { 
      console.error("Move Error:", error);
      alert(`Erro ao mover card: ${error.message}`);
    }
  };

  const handlePayIndication = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const updatedLead = { ...lead, indicationPaymentStatus: 'Pago' };
    const cleanLead = Object.fromEntries(Object.entries(updatedLead).filter(([_, v]) => v !== undefined));

    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', leadId), cleanLead);
    } catch (error: any) { 
      console.error("Pay Error:", error);
      alert(`Erro ao atualizar pagamento: ${error.message}`);
    }
  };

  const copyPix = (pix: string) => {
    navigator.clipboard.writeText(pix);
    alert('Chave PIX copiada!');
  };

  const openWhatsAppTemplate = (lead: Lead) => {
    const phone = lead.whatsapp.replace(/\D/g, '');
    let text = `Olá, somos da Agência GMN. `;
    if (lead.commercialStatus === 'Proposta Enviada') text = `Olá, enviamos a proposta para a ${lead.companyName}. Conseguiu dar uma olhada?`;
    else if (lead.operationStatus === 'Aguardar Dados') text = `Olá, precisamos de alguns dados para iniciar o serviço da ${lead.companyName}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchesSearch = l.companyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            l.whatsapp.includes(searchTerm) ||
                            (l.niche && l.niche.toLowerCase().includes(searchTerm.toLowerCase()));
      
      let matchesQuick = true;
      if (quickFilter === 'GMN') matchesQuick = l.serviceType === 'Google Meu Negócio' || l.serviceType === 'GMN + Site';
      if (quickFilter === 'Site') matchesQuick = l.serviceType === 'Criação de Site' || l.serviceType === 'GMN + Site';
      if (quickFilter === 'Indicações') matchesQuick = l.origin === 'Indicação';

      return matchesSearch && matchesQuick;
    });
  }, [leads, searchTerm, quickFilter]);

  const onDragStart = (e: React.DragEvent, leadId: string) => e.dataTransfer.setData('leadId', leadId);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent, status: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) handleMoveLead(leadId, status);
  };

  const getColumnColor = (col: string) => {
    if (col === 'Ganho' || col === 'Concluído') return 'bg-emerald-500';
    if (col === 'Perdido') return 'bg-rose-500';
    if (col === 'Prospecção (Frios)' || col === 'Aguardar Dados') return 'bg-gray-600';
    return 'bg-blue-500';
  };

  const renderKanban = () => {
    const columns = funnel === 'commercial' ? COMMERCIAL_COLUMNS : OPERATION_COLUMNS;
    const today = new Date().toISOString().split('T')[0];

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
        <div className="px-4 pt-4 pb-2 flex items-center space-x-2 shrink-0 overflow-x-auto custom-scrollbar">
          <span className="text-sm text-gray-500 font-medium mr-1">Filtros Rápidos:</span>
          {['Todos', 'GMN', 'Site', 'Indicações'].map(f => (
            <button 
              key={f}
              onClick={() => setQuickFilter(f as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${quickFilter === f ? 'bg-blue-600 text-white border border-blue-500' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div 
          className="flex-1 overflow-x-auto p-4 custom-scrollbar"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <div className="flex space-x-3 min-w-max h-full items-start">
          {columns.map(col => {
            const leadsInCol = filteredLeads.filter(l => funnel === 'commercial' ? l.commercialStatus === col : l.operationStatus === col);
            return (
              <div key={col} className="w-[240px] shrink-0 flex flex-col bg-gray-900/50 rounded-2xl border border-gray-800 max-h-full" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col)}>
                <div className="p-3 flex justify-between items-center bg-gray-900 rounded-t-2xl border-b border-gray-800">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getColumnColor(col)}`}></div>
                    <h3 className="font-semibold text-gray-200 text-sm truncate" title={col}>{col}</h3>
                  </div>
                  <span className="bg-gray-800 text-gray-300 text-[10px] py-0.5 px-2 rounded-full font-medium border border-gray-700 shrink-0">{leadsInCol.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[150px] custom-scrollbar" onWheel={(e) => e.stopPropagation()}>
                  {leadsInCol.map(lead => {
                    const isLate = lead.nextContactDate && lead.nextContactDate < today;
                    const isToday = lead.nextContactDate === today;
                    const lastUpdate = lead.history && lead.history.length > 0 ? lead.history[lead.history.length - 1].date : lead.createdAt;
                    const daysInactive = Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
                    const isCold = daysInactive >= 5 && !['Ganho', 'Perdido', 'Concluído'].includes(funnel === 'commercial' ? lead.commercialStatus : (lead.operationStatus || ''));
                    
                    return (
                      <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead.id)} onClick={() => { setEditingLead(lead); setIsModalOpen(true); }} className={`bg-gray-900 p-3 rounded-xl border ${isCold ? 'border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.15)]' : isLate ? 'border-rose-500/50' : isToday ? 'border-yellow-500/50' : 'border-gray-800'} cursor-grab active:cursor-grabbing hover:border-blue-500/50 hover:bg-gray-800/80 transition-all group shadow-sm flex flex-col`}>
                        <div className="flex justify-between items-start mb-1.5">
                          <h4 className="font-semibold text-gray-100 text-sm leading-tight pr-2">{lead.companyName}</h4>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isCold && <span title={`Inativo há ${daysInactive} dias`} className="bg-cyan-950/50 text-cyan-400 border border-cyan-900/50 text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center"><Snowflake size={8} className="mr-1" /> {daysInactive}d</span>}
                            {lead.origin === 'Indicação' && <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 text-[9px] px-1.5 py-0.5 rounded font-semibold flex items-center"><Tag size={8} className="mr-1" /> Indicação</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {lead.niche && <span className="text-[10px] text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 truncate max-w-full">{lead.niche}</span>}
                          {lead.serviceType && <span className="text-[10px] text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 flex items-center truncate max-w-full"><Briefcase size={10} className="mr-1 shrink-0"/> <span className="truncate">{lead.serviceType}</span></span>}
                        </div>
                        {lead.nextContactDate && (
                          <div className={`text-[10px] flex items-center mb-2 ${isLate ? 'text-rose-400' : isToday ? 'text-yellow-400' : 'text-gray-500'}`}>
                            <Calendar size={10} className="mr-1"/> Contato: {new Date(lead.nextContactDate).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        <div className="flex justify-between items-end mt-auto pt-2 border-t border-gray-800">
                          <div className="flex space-x-2 text-gray-500">
                            {lead.whatsapp && <button type="button" onClick={(e) => { e.stopPropagation(); openWhatsAppTemplate(lead); }} className="hover:text-emerald-400 transition-colors p-1 -ml-1"><MessageCircle size={14} /></button>}
                            {lead.googleMapsLink && <a href={lead.googleMapsLink} target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors p-1" onClick={e => e.stopPropagation()}><MapPin size={14} /></a>}
                            {lead.deliveryLink && <a href={lead.deliveryLink} target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors p-1" onClick={e => e.stopPropagation()} title="Acessar App/Site Entregue"><Globe size={14} /></a>}
                            {lead.clientData && <div className="text-blue-400 p-1" title="Possui dados da operação"><AlignLeft size={14} /></div>}
                            {lead.files?.length > 0 && <div className="text-gray-400 p-1" title="Possui arquivos"><Paperclip size={14} /></div>}
                          </div>
                          {lead.dealValue ? <span className="text-xs font-medium text-emerald-400">R$ {lead.dealValue.toLocaleString('pt-BR')}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    );
  };

  const renderIndications = () => {
    const indications = leads.filter(l => l.origin === 'Indicação' && l.commercialStatus === 'Ganho');
    return (
      <div className="p-6 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar bg-gray-950">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div><h2 className="text-2xl font-bold text-gray-100">Gestão de Indicações</h2><p className="text-gray-400 mt-1">Gerencie os pagamentos de comissão (R$ 50) por indicações ganhas.</p></div>
          <div className="bg-gray-900 px-4 py-3 rounded-xl border border-gray-800 flex items-center space-x-4 w-full md:w-auto">
            <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total a Pagar</p><p className="text-xl font-bold text-yellow-500">R$ {indications.filter(i => i.indicationPaymentStatus === 'Pendente').length * 50},00</p></div>
            <div className="w-px h-10 bg-gray-800"></div>
            <div><p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Pago</p><p className="text-xl font-bold text-emerald-500">R$ {indications.filter(i => i.indicationPaymentStatus === 'Pago').length * 50},00</p></div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-950/50 border-b border-gray-800">
                  <th className="p-4 font-semibold text-gray-400 text-sm">Cliente</th><th className="p-4 font-semibold text-gray-400 text-sm">Indicador</th><th className="p-4 font-semibold text-gray-400 text-sm">Chave PIX</th><th className="p-4 font-semibold text-gray-400 text-sm">Status</th><th className="p-4 font-semibold text-gray-400 text-sm text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {indications.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-200 font-medium">{lead.companyName}</td><td className="p-4 text-gray-400">{lead.indicatorName}</td>
                    <td className="p-4 text-gray-400 font-mono text-sm flex items-center">
                      {lead.indicatorPix}
                      <button onClick={() => copyPix(lead.indicatorPix || '')} className="ml-2 text-gray-500 hover:text-blue-400"><Copy size={14}/></button>
                    </td>
                    <td className="p-4">
                      {lead.indicationPaymentStatus === 'Pago' ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle size={12} className="mr-1.5" /> Pago</span> : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><Clock size={12} className="mr-1.5" /> Pendente</span>}
                    </td>
                    <td className="p-4 text-right">
                      {lead.indicationPaymentStatus === 'Pendente' && <button onClick={() => handlePayIndication(lead.id)} className="text-sm bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-all font-medium">Marcar como Pago</button>}
                    </td>
                  </tr>
                ))}
                {indications.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-gray-500"><Users size={48} className="mx-auto text-gray-700 mb-4" /><p className="text-lg font-medium text-gray-300">Nenhuma indicação ganha</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const totalPipeline = leads.filter(l => l.commercialStatus !== 'Ganho' && l.commercialStatus !== 'Perdido').reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const totalWonValue = leads.filter(l => l.commercialStatus === 'Ganho' && !l.isRecurring).reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const mrr = leads.filter(l => l.commercialStatus === 'Ganho' && l.isRecurring).reduce((acc, l) => acc + (l.dealValue || 0), 0);
    
    const totalLeads = leads.length;
    const totalWon = leads.filter(l => l.commercialStatus === 'Ganho').length;
    const conversionRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

    const originStats = leads.reduce((acc, l) => { 
      if (!acc[l.origin]) acc[l.origin] = { total: 0, won: 0 };
      acc[l.origin].total += 1;
      if (l.commercialStatus === 'Ganho') acc[l.origin].won += 1;
      return acc; 
    }, {} as Record<string, {total: number, won: number}>);

    return (
      <div className="p-6 max-w-6xl mx-auto w-full overflow-y-auto custom-scrollbar bg-gray-950">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Dashboard Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm font-medium mb-1">MRR (Recorrente)</p>
            <p className="text-3xl font-bold text-purple-400">R$ {mrr.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-gray-500 mt-2">Receita Mensal Recorrente</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm font-medium mb-1">Taxa de Conversão</p>
            <p className="text-3xl font-bold text-blue-400">{conversionRate}%</p>
            <p className="text-xs text-gray-500 mt-2">{totalWon} de {totalLeads} leads fechados</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm font-medium mb-1">Previsão em Pipeline</p>
            <p className="text-3xl font-bold text-yellow-500">R$ {totalPipeline.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm font-medium mb-1">Faturamento Único</p>
            <p className="text-3xl font-bold text-emerald-400">R$ {totalWonValue.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <p className="text-gray-400 text-sm font-medium mb-1">Total de Leads</p>
            <p className="text-3xl font-bold text-gray-100">{totalLeads}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Conversão por Origem</h3>
            <div className="space-y-6">
              {Object.entries(originStats).map(([origin, stats]) => {
                const typedStats = stats as {total: number, won: number};
                const rate = typedStats.total > 0 ? Math.round((typedStats.won / typedStats.total) * 100) : 0;
                return (
                  <div key={origin}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 font-medium">{origin}</span>
                      <span className="text-emerald-400 font-bold">{rate}% <span className="text-gray-500 font-normal text-xs ml-1">({typedStats.won}/{typedStats.total})</span></span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${rate}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Volume por Origem</h3>
            <div className="space-y-6">
              {Object.entries(originStats).map(([origin, stats]) => {
                const typedStats = stats as {total: number, won: number};
                const pct = totalLeads > 0 ? Math.round((typedStats.total / totalLeads) * 100) : 0;
                return (
                  <div key={origin}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 font-medium">{origin}</span>
                      <span className="text-blue-400 font-bold">{typedStats.total} <span className="text-gray-500 font-normal text-xs ml-1">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-950 font-sans overflow-hidden text-gray-100">
      <aside className={`w-64 bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300 z-20 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub central Logo" className="h-8 w-auto object-contain" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold tracking-tight text-gray-100">Hub central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-gray-300" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => { setView('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200 border border-transparent'}`}><LayoutDashboard size={20} /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setView('indications'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'indications' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200 border border-transparent'}`}><DollarSign size={20} /><span className="font-medium">Indicações</span></button>
          <button onClick={() => { setView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'analytics' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200 border border-transparent'}`}><BarChart3 size={20} /><span className="font-medium">Analytics</span></button>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-gray-200 truncate">{user.displayName || 'Usuário'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-rose-400 transition-colors p-1" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-950">
        <header className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0 z-10 gap-4">
          <div className="flex items-center flex-1">
            <button className="md:hidden mr-4 text-gray-400 hover:text-gray-200" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            {view === 'dashboard' && (
              <div className="flex items-center w-full gap-4">
                <div className="flex bg-gray-900 p-1 rounded-xl overflow-x-auto custom-scrollbar border border-gray-800 shrink-0">
                  <button onClick={() => setFunnel('commercial')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${funnel === 'commercial' ? 'bg-gray-800 text-gray-100 shadow-sm border border-gray-700' : 'text-gray-400 hover:text-gray-200 border border-transparent'}`}>Funil Comercial</button>
                  <button onClick={() => setFunnel('operation')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${funnel === 'operation' ? 'bg-gray-800 text-gray-100 shadow-sm border border-gray-700' : 'text-gray-400 hover:text-gray-200 border border-transparent'}`}>Funil de Operação</button>
                </div>
                <div className="relative hidden sm:block max-w-md w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
            )}
            {view === 'indications' && <h2 className="text-xl font-semibold text-gray-100">Comissões</h2>}
            {view === 'analytics' && <h2 className="text-xl font-semibold text-gray-100">Métricas</h2>}
          </div>
          <button onClick={() => { setEditingLead(null); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm shrink-0"><Plus size={18} /><span className="hidden sm:inline">Novo Cliente</span></button>
        </header>

        {loading ? <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div> : (
          view === 'dashboard' ? renderKanban() : view === 'indications' ? renderIndications() : renderAnalytics()
        )}
      </main>

      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveLead} onDelete={handleDeleteLead} initialData={editingLead} />
      {sidebarOpen && <div className="fixed inset-0 bg-black/80 z-10 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  if (!user) {
    return <Auth />;
  }

  return <CRM user={user} />;
}
