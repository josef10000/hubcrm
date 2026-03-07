import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, Users, Plus, X, DollarSign, CheckCircle, Clock, 
  MapPin, Phone, Tag, Menu, Building2, FileText, Briefcase, AlignLeft,
  Search, BarChart3, Calendar, Paperclip, Copy, MessageCircle, Trash2, Snowflake, LogOut, Globe,
  Filter, ArrowDownAZ, ArrowUpRight
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
  niche?: string;
  notes?: string;
  cpfCnpj?: string;
  email?: string;
  asaasCustomerId?: string;
  asaasSubscriptionId?: string;
  invoiceUrl?: string;
  paymentStatus?: 'PENDING' | 'RECEIVED' | 'OVERDUE' | 'N/A';
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white/10 backdrop-blur-3xl rounded-3xl shadow-2xl w-full max-w-lg flex flex-col border border-white/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">CPF/CNPJ *</label>
              <input required type="text" name="cpfCnpj" value={formData.cpfCnpj || ''} onChange={handleChange} placeholder="Apenas números" className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail *</label>
              <input required type="email" name="email" value={formData.email || ''} onChange={handleChange} placeholder="cliente@email.com" className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" />
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Nicho / Área de Atuação</label>
              <input type="text" name="niche" value={formData.niche || ''} onChange={handleChange} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500" placeholder="Ex: Advogado, Clínica, E-commerce..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Anotações e Credenciais</label>
              <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full px-4 py-3 bg-black/20 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-500 custom-scrollbar" placeholder="Anotações importantes, links de referência, acessos..."></textarea>
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'analytics'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<SiteStatus | 'Todos'>('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'value'>('recent');

  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    let timeoutId: NodeJS.Timeout;
    let unsubscribe: () => void = () => {};

    try {
      const clientsRef = collection(db, 'users', user.uid, 'clients');
      unsubscribe = onSnapshot(clientsRef, (snapshot) => {
        const loadedClients: Client[] = [];
        snapshot.forEach((doc) => {
          loadedClients.push(doc.data() as Client);
        });
        setClients(loadedClients);
        setLoading(false);
        clearTimeout(timeoutId);
      }, (error: any) => {
        console.error("Error fetching clients:", error);
        setErrorMsg(`Erro ao carregar dados do banco: ${error.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      });

      timeoutId = setTimeout(() => {
        console.warn("Firestore initialization timed out.");
        setLoading(false);
        setErrorMsg("O tempo limite de conexão com o banco de dados foi excedido. Verifique sua conexão ou se o navegador está bloqueando o acesso.");
      }, 10000);

    } catch (err: any) {
      console.error("Firestore Init Error:", err);
      setErrorMsg(err.message);
      setLoading(false);
    }

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [user.uid]);

  const handleSaveClient = async (clientData: Partial<Client>) => {
    const isNew = !clientData.id;
    const client: Client = {
      id: clientData.id || crypto.randomUUID(),
      name: clientData.name || '',
      whatsapp: clientData.whatsapp || '',
      plan: clientData.plan as PlanType || 'Padrão',
      status: clientData.status as SiteStatus || 'Em Desenvolvimento',
      siteLink: clientData.siteLink,
      niche: clientData.niche,
      notes: clientData.notes,
      createdAt: clientData.createdAt || Date.now(),
      cpfCnpj: clientData.cpfCnpj,
      email: clientData.email,
      asaasCustomerId: clientData.asaasCustomerId,
      asaasSubscriptionId: clientData.asaasSubscriptionId,
      invoiceUrl: clientData.invoiceUrl,
      paymentStatus: clientData.paymentStatus || 'PENDING',
    };

    setIsModalOpen(false); 
    setEditingClient(null);

    try { 
      // Integrate with Asaas for new clients or clients without Asaas ID
      if (!client.asaasCustomerId && client.cpfCnpj && client.email) {
        // 1. Create Customer in Asaas
        const customerRes = await fetch('/api/asaas/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: client.name,
            cpfCnpj: client.cpfCnpj.replace(/\D/g, ''),
            email: client.email,
            phone: client.whatsapp.replace(/\D/g, '')
          })
        });
        
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          client.asaasCustomerId = customerData.id;

          // 2. Create Payment in Asaas
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          const dueDate = nextMonth.toISOString().split('T')[0];
          
          const value = client.plan === 'Profissional' ? 120 : 80;

          const payRes = await fetch('/api/asaas/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customer: client.asaasCustomerId,
              value: value,
              dueDate: dueDate,
              description: `Plano ${client.plan} - Hub Central`
            })
          });

          if (payRes.ok) {
            const payData = await payRes.json();
            client.asaasSubscriptionId = payData.id; // Using this field for payment ID
            client.invoiceUrl = payData.invoiceUrl;
            client.paymentStatus = payData.status || 'PENDING';
          }
        } else {
          const err = await customerRes.json();
          console.error("Asaas Customer Error:", err);
          alert(`Erro ao criar cliente no Asaas: ${err.error || 'Erro desconhecido'}`);
        }
      }

      const cleanClient = Object.fromEntries(Object.entries(client).filter(([_, v]) => v !== undefined));
      await setDoc(doc(db, 'users', user.uid, 'clients', client.id), cleanClient);
    } catch (error: any) { 
      console.error("Save Error:", error);
      alert(`Erro ao salvar cliente: ${error.message}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setIsModalOpen(false);
    setEditingClient(null);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'clients', clientId));
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao excluir: ${error.message}`);
    }
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.whatsapp.includes(searchTerm) ||
                            (c.niche && c.niche.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'Todos' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'value') {
        const valA = a.plan === 'Profissional' ? 120 : 80;
        const valB = b.plan === 'Profissional' ? 120 : 80;
        return valB - valA;
      } else {
        return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [clients, searchTerm, filterStatus, sortBy]);

  const renderDashboard = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Quick Filters & Sort */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-2xl overflow-x-auto max-w-full custom-scrollbar">
              {['Todos', 'Em Desenvolvimento', 'Ativo', 'Cancelado'].map((status) => {
                const count = status === 'Todos' ? clients.length : clients.filter(c => c.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      filterStatus === status 
                        ? 'bg-white/10 text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {status} <span className="ml-1 opacity-60 text-xs">({count})</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center space-x-2 bg-white/5 backdrop-blur-xl border border-white/10 p-1 rounded-2xl">
              <button onClick={() => setSortBy('recent')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'recent' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}><Clock size={16} className="mr-2"/> Recentes</button>
              <button onClick={() => setSortBy('alphabetical')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'alphabetical' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}><ArrowDownAZ size={16} className="mr-2"/> A-Z</button>
              <button onClick={() => setSortBy('value')} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center ${sortBy === 'value' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}><DollarSign size={16} className="mr-2"/> Valor</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl cursor-pointer hover:bg-white/[0.15] transition-all group relative overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.15)] hover:-translate-y-1 flex flex-col h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white truncate pr-4">{client.name}</h3>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md ${
                      client.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                      client.status === 'Cancelado' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                      'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {client.status}
                    </span>
                    {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}>
                        {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center text-gray-300 text-sm">
                    <Phone size={16} className="mr-3 text-orange-400 opacity-80" />
                    {client.whatsapp}
                  </div>
                  
                  <div className="flex items-center text-gray-300 text-sm">
                    <Tag size={16} className="mr-3 text-orange-400 opacity-80" />
                    Plano {client.plan} <span className="ml-2 text-xs opacity-60">(R$ {client.plan === 'Profissional' ? '120' : '80'})</span>
                  </div>
                  
                  {client.niche && (
                    <div className="flex items-center text-gray-300 text-sm">
                      <Briefcase size={16} className="mr-3 text-orange-400 opacity-80 shrink-0" />
                      <span className="truncate">{client.niche}</span>
                    </div>
                  )}
                  
                  {client.siteLink && (
                    <div className="flex items-center text-gray-300 text-sm">
                      <Globe size={16} className="mr-3 text-orange-400 opacity-80" />
                      <a href={client.siteLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" onClick={e => e.stopPropagation()}>
                        {client.siteLink}
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
                  {client.invoiceUrl && (
                    <a 
                      href={client.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center justify-center w-full py-2.5 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-sm font-medium"
                    >
                      <DollarSign size={18} className="mr-2" />
                      Ver Fatura
                    </a>
                  )}
                  <a 
                    href={`https://wa.me/55${client.whatsapp.replace(/\D/g, '')}?text=Olá ${client.name}, tudo bem? Aqui é do Hub central.`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center w-full py-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/30 transition-colors text-sm font-medium"
                  >
                    <MessageCircle size={18} className="mr-2" />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="col-span-full py-16 text-center border border-white/10 bg-white/5 backdrop-blur-xl rounded-3xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-400">Ajuste os filtros ou adicione um novo cliente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'Ativo').length;
    const mrr = clients.filter(c => c.status === 'Ativo').reduce((acc, c) => acc + (c.plan === 'Profissional' ? 120 : 80), 0);
    
    const planData = [
      { name: 'Padrão', value: clients.filter(c => c.plan === 'Padrão').length, color: '#f97316' },
      { name: 'Profissional', value: clients.filter(c => c.plan === 'Profissional').length, color: '#f59e0b' }
    ];

    const statusData = [
      { name: 'Em Desenvolvimento', value: clients.filter(c => c.status === 'Em Desenvolvimento').length, color: '#eab308' },
      { name: 'Ativo', value: activeClients, color: '#10b981' },
      { name: 'Cancelado', value: clients.filter(c => c.status === 'Cancelado').length, color: '#ef4444' }
    ];

    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const thisWeekCount = clients.filter(c => now - c.createdAt <= oneWeek).length;
    const lastWeekCount = clients.filter(c => (now - c.createdAt > oneWeek) && (now - c.createdAt <= 2 * oneWeek)).length;
    
    let weeklyGrowth = 0;
    if (lastWeekCount > 0) {
      weeklyGrowth = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
    } else if (thisWeekCount > 0) {
      weeklyGrowth = 100;
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const monthlyData = months.map(m => ({ name: m, value: 0 }));
    
    clients.forEach(c => {
      const d = new Date(c.createdAt);
      if (d.getFullYear() === currentYear) {
        monthlyData[d.getMonth()].value += 1;
      }
    });

    return (
      <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-400 text-sm font-medium mb-2">Total de Clientes</p>
              <p className="text-4xl font-bold text-white">{totalClients}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <p className="text-gray-400 text-sm font-medium mb-2">Clientes Ativos</p>
              <p className="text-4xl font-bold text-emerald-400">{activeClients}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-500/20 rounded-full blur-3xl"></div>
              <p className="text-gray-400 text-sm font-medium mb-2">MRR (Recorrente)</p>
              <p className="text-4xl font-bold text-orange-400">R$ {mrr.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-white mb-6">Distribuição por Plano</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                      {planData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {planData.map(plan => (
                  <div key={plan.name} className="flex items-center text-sm text-gray-300">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: plan.color }}></div>
                    {plan.name} ({plan.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-white mb-6">Status dos Clientes</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} width={120} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <h3 className="text-lg font-semibold text-white mb-6">Aquisição de Clientes ({currentYear})</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] flex flex-col justify-center">
              <h3 className="text-lg font-semibold text-white mb-2">Aquisição Semanal</h3>
              <p className="text-gray-400 text-sm mb-6">Novos clientes nos últimos 7 dias</p>
              
              <div className="flex items-end space-x-4 mb-4">
                <span className="text-6xl font-bold text-white">{thisWeekCount}</span>
                <div className={`flex items-center pb-2 ${weeklyGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {weeklyGrowth >= 0 ? <ArrowUpRight size={20} className="mr-1" /> : <ArrowUpRight size={20} className="mr-1 rotate-90" />}
                  <span className="font-semibold">{Math.abs(weeklyGrowth)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">vs. {lastWeekCount} na semana anterior</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] font-sans overflow-hidden text-gray-100 relative">
      {/* Liquid Glass Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-orange-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-amber-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <aside className={`w-64 bg-black/40 backdrop-blur-3xl border-r border-white/10 flex flex-col transition-all duration-300 z-30 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://i.imgur.com/2H9UPAW.png" alt="Hub central Logo" className="h-20 w-auto object-contain drop-shadow-lg" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap">Hub central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-white shrink-0 ml-2" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => { setView('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'dashboard' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><LayoutDashboard size={20} /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${view === 'analytics' ? 'bg-white/10 text-white shadow-sm border border-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><BarChart3 size={20} /><span className="font-medium">Analytics</span></button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-orange-500/20">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate">{user.displayName || 'Usuário'}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-20">
        <header className="bg-black/20 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-30 gap-4">
          <div className="flex items-center flex-1">
            <button className="md:hidden mr-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            {view === 'dashboard' && (
              <div className="flex items-center w-full max-w-md relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white text-sm rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder-gray-500 shadow-inner" />
              </div>
            )}
            {view === 'analytics' && <h2 className="text-xl font-semibold text-white">Métricas</h2>}
          </div>
          <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] hover:scale-105 active:scale-95 shrink-0"><Plus size={18} /><span className="hidden sm:inline">Novo Cliente</span></button>
        </header>

        {loading ? <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div> : (
          errorMsg ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
                <h2 className="text-red-400 font-semibold mb-2">Erro de Conexão</h2>
                <p className="text-gray-300 text-sm mb-4">{errorMsg}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
              </div>
            </div>
          ) : (
            view === 'dashboard' ? renderDashboard() : renderAnalytics()
          )
        )}
      </main>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveClient} onDelete={handleDeleteClient} initialData={editingClient} />
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-md" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }, (error) => {
        console.error("Auth Error:", error);
        setAuthError(error.message);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      });

      // Fallback timeout in case onAuthStateChanged never fires (e.g. blocked storage in Safari iframes)
      timeoutId = setTimeout(() => {
        console.warn("Auth initialization timed out. This may happen in restricted browsers (like Safari in an iframe).");
        setAuthLoading(false);
        setAuthError("O tempo limite de autenticação foi excedido. Se você estiver no iPhone/Safari, tente abrir o link diretamente no navegador (fora de outros apps) ou permita cookies de terceiros.");
      }, 10000);

      return () => {
        unsubscribe();
        clearTimeout(timeoutId);
      };
    } catch (err: any) {
      console.error("Auth Init Error:", err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  }, []);

  if (authLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div><p className="text-gray-400 text-sm">Carregando autenticação...</p></div>;
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <h2 className="text-red-400 font-semibold mb-2">Erro de Autenticação</h2>
          <p className="text-gray-300 text-sm mb-4">{authError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm">Tentar Novamente</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <CRM user={user} />;
}
