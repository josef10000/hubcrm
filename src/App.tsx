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

type Origin = 'Prospecção' | 'Tráfego Pago' | 'Indicação';
type CommercialStatus = 'Prospecção (Frios)' | 'Contacto Inicial' | 'Em Negociação' | 'Proposta Enviada' | 'Follow-up' | 'Ganho' | 'Perdido';
type OperationStatus = 'Aguardar Dados' | 'Criar/Verificar GMN' | 'Otimização do Perfil' | 'Configurar App/Site' | 'Validação' | 'Concluído';
type ServiceType = 'Google Meu Negócio' | 'Criação de Site' | 'GMN + Site' | 'Outro';

interface LeadHistory { date: number; action: string; }
interface LeadFile { name: string; data: string; }

interface Lead {
  id: string; companyName: string; niche: string; whatsapp: string; googleMapsLink: string;
  origin: Origin; indicatorName?: string; indicatorPix?: string;
  commercialStatus: CommercialStatus; operationStatus?: OperationStatus;
  indicationPaymentStatus?: 'Pendente' | 'Pago'; createdAt: number;
  serviceType?: ServiceType; dealValue?: number; isRecurring?: boolean; clientData?: string; notes?: string; deliveryLink?: string;
  nextContactDate?: string; history: LeadHistory[]; files: LeadFile[];
}

const COMMERCIAL_COLUMNS: CommercialStatus[] = ['Prospecção (Frios)', 'Contacto Inicial', 'Em Negociação', 'Proposta Enviada', 'Follow-up', 'Ganho', 'Perdido'];
const OPERATION_COLUMNS: OperationStatus[] = ['Aguardar Dados', 'Criar/Verificar GMN', 'Otimização do Perfil', 'Configurar App/Site', 'Validação', 'Concluído'];

const STORAGE_KEY = 'crm_leads_v3';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function LeadModal({ isOpen, onClose, onSave, onDelete, initialData }: { isOpen: boolean, onClose: () => void, onSave: (data: Partial<Lead>) => void, onDelete?: (id: string) => void, initialData: Lead | null }) {
  const [formData, setFormData] = useState<Partial<Lead>>({ origin: 'Prospecção', serviceType: 'Google Meu Negócio', history: [], files: [] });
  const [activeTab, setActiveTab] = useState<'basic'|'operation'|'history'>('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ origin: 'Prospecção', commercialStatus: 'Prospecção (Frios)', serviceType: 'Google Meu Negócio', history: [{ date: Date.now(), action: 'Lead criado' }], files: [] });
    }
    setActiveTab('basic');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'dealValue' ? Number(value) : value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          files: [...(prev.files || []), { name: file.name, data: reader.result as string }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-800">
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-gray-100">{initialData ? 'Detalhes do Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={24} /></button>
        </div>
        
        <div className="flex border-b border-gray-800 px-6 pt-2 overflow-x-auto custom-scrollbar">
          <button type="button" onClick={() => setActiveTab('basic')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'basic' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Informações Básicas</button>
          <button type="button" onClick={() => setActiveTab('operation')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'operation' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Operação & Arquivos</button>
          {initialData && <button type="button" onClick={() => setActiveTab('history')} className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Histórico</button>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Nome da Empresa *</label><input required type="text" name="companyName" value={formData.companyName || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Nicho de Atuação</label><input type="text" name="niche" value={formData.niche || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp do Decisor</label><input type="text" name="whatsapp" value={formData.whatsapp || ''} onChange={handleChange} placeholder="Ex: 11999999999" className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Link do Google Maps</label><input type="url" name="googleMapsLink" value={formData.googleMapsLink || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Próximo Contato</label><input type="date" name="nextContactDate" value={formData.nextContactDate || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" style={{colorScheme: 'dark'}} /></div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de Serviço</label>
                  <select name="serviceType" value={formData.serviceType || 'Google Meu Negócio'} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Google Meu Negócio">Google Meu Negócio</option><option value="Criação de Site">Criação de Site</option><option value="GMN + Site">GMN + Site</option><option value="Outro">Outro</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">Valor do Fechamento (R$)</label><input type="number" name="dealValue" value={formData.dealValue || ''} onChange={handleChange} placeholder="Ex: 1500" className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div className="flex items-center mt-6">
                  <input type="checkbox" id="isRecurring" name="isRecurring" checked={formData.isRecurring || false} onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))} className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 rounded focus:ring-blue-500 focus:ring-2" />
                  <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-300">Receita Recorrente (Mensalidade)</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Origem</label>
                  <select name="origin" value={formData.origin || 'Prospecção'} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Prospecção">Prospecção</option><option value="Tráfego Pago">Tráfego Pago</option><option value="Indicação">Indicação</option>
                  </select>
                </div>
                {formData.origin === 'Indicação' && (
                  <div className="p-4 bg-blue-900/20 rounded-xl space-y-4 border border-blue-800/50">
                    <div><label className="block text-sm font-medium text-blue-300 mb-1">Nome do Indicador *</label><input required type="text" name="indicatorName" value={formData.indicatorName || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-blue-800/50 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-sm font-medium text-blue-300 mb-1">Chave PIX do Indicador *</label><input required type="text" name="indicatorPix" value={formData.indicatorPix || ''} onChange={handleChange} className="w-full px-4 py-2 bg-gray-950 border border-blue-800/50 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'operation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center"><AlignLeft size={16} className="mr-2 text-blue-400" />Dados do Cliente</label>
                  <textarea name="clientData" value={formData.clientData || ''} onChange={handleChange} rows={5} placeholder="Acessos, links..." className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center"><FileText size={16} className="mr-2 text-gray-400" />Anotações</label>
                  <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={5} placeholder="Observações..." className="w-full px-4 py-3 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none custom-scrollbar resize-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center"><Globe size={16} className="mr-2 text-emerald-400" />Link do App/Site Entregue</label>
                  <input type="url" name="deliveryLink" value={formData.deliveryLink || ''} onChange={handleChange} placeholder="https://..." className="w-full px-4 py-2 bg-gray-950 border border-gray-800 text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center"><Paperclip size={16} className="mr-2 text-blue-400" />Arquivos Anexos</label>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2">
                    {formData.files?.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-900 p-2 rounded border border-gray-800">
                        <span className="text-xs text-gray-300 truncate max-w-[200px]">{f.name}</span>
                        <button type="button" onClick={() => setFormData(prev => ({...prev, files: prev.files?.filter((_, idx) => idx !== i)}))} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
                      </div>
                    ))}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-2 border border-dashed border-gray-700 text-gray-400 rounded hover:bg-gray-900 hover:text-gray-300 text-sm transition-colors">
                      + Anexar Arquivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {formData.history?.slice().reverse().map((h, i) => (
                <div key={i} className="flex space-x-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                    {i !== formData.history!.length - 1 && <div className="w-px h-full bg-gray-800 my-1"></div>}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-gray-200">{h.action}</p>
                    <p className="text-xs text-gray-500">{new Date(h.date).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-6 border-t border-gray-800 flex justify-between items-center mt-auto">
            {initialData && onDelete ? (
              <button type="button" onClick={() => { if(window.confirm('Tem certeza que deseja excluir este cliente?')) onDelete(initialData.id); }} className="px-4 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg font-medium flex items-center transition-colors"><Trash2 size={16} className="mr-2"/> Excluir</button>
            ) : <div></div>}
            <div className="flex space-x-3">
              <button type="button" onClick={onClose} className="px-5 py-2 text-gray-400 hover:bg-gray-800 rounded-lg font-medium">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-sm">Salvar Dados</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CRM({ user }: { user: User }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'indications' | 'analytics'>('dashboard');
  const [funnel, setFunnel] = useState<'commercial' | 'operation'>('commercial');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'Todos' | 'GMN' | 'Site' | 'Indicações'>('Todos');

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
    }, (error) => {
      console.error("Error fetching leads:", error);
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

    setIsModalOpen(false); setEditingLead(null);
    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', lead.id), lead);
    } catch (error) { console.error(error); }
  };

  const handleDeleteLead = async (leadId: string) => {
    setIsModalOpen(false);
    setEditingLead(null);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'leads', leadId));
    } catch (error) {
      console.error(error);
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
    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', leadId), { ...lead, ...updates });
    } catch (error) { console.error(error); }
  };

  const handlePayIndication = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    try { 
      await setDoc(doc(db, 'users', user.uid, 'leads', leadId), { ...lead, indicationPaymentStatus: 'Pago' });
    } catch (error) { console.error(error); }
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
        <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
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
                <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[150px] custom-scrollbar">
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20"><Building2 size={18} className="text-white" /></div>
            <h1 className="text-xl font-bold tracking-tight text-gray-100">GMN CRM</h1>
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
