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
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const loadedClients: Client[] = [];
      snapshot.forEach((doc) => {
        loadedClients.push(doc.data() as Client);
      });
      setClients(loadedClients);
      setLoading(false);
    }, (error: any) => {
      console.error("Error fetching clients:", error);
      alert(`Erro ao carregar dados do banco: ${error.message}\n\nVerifique se o Firestore Database foi criado no painel do Firebase e se as Regras (Rules) permitem leitura/escrita.`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSaveClient = async (clientData: Partial<Client>) => {
    const client: Client = {
      id: clientData.id || crypto.randomUUID(),
      name: clientData.name || '',
      whatsapp: clientData.whatsapp || '',
      plan: clientData.plan as PlanType || 'Padrão',
      status: clientData.status as SiteStatus || 'Em Desenvolvimento',
      siteLink: clientData.siteLink,
      createdAt: clientData.createdAt || Date.now(),
    };

    const cleanClient = Object.fromEntries(Object.entries(client).filter(([_, v]) => v !== undefined));

    setIsModalOpen(false); 
    setEditingClient(null);
    try { 
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
    return clients.filter(c => {
      return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             c.whatsapp.includes(searchTerm);
    });
  }, [clients, searchTerm]);

  const renderDashboard = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-black/90 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-white/5 border border-white/10 p-6 rounded-2xl cursor-pointer hover:bg-white/10 transition-all group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white truncate pr-4">{client.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                    client.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 
                    client.status === 'Cancelado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {client.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-gray-400 text-sm">
                    <Phone size={16} className="mr-2 text-orange-400" />
                    {client.whatsapp}
                  </div>
                  
                  <div className="flex items-center text-gray-400 text-sm">
                    <Tag size={16} className="mr-2 text-orange-400" />
                    Plano {client.plan}
                  </div>
                  
                  {client.siteLink && (
                    <div className="flex items-center text-gray-400 text-sm">
                      <Globe size={16} className="mr-2 text-orange-400" />
                      <a href={client.siteLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate" onClick={e => e.stopPropagation()}>
                        {client.siteLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <Users size={48} className="mx-auto text-gray-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Nenhum cliente encontrado</h3>
                <p className="text-gray-500">Adicione seu primeiro cliente clicando no botão acima.</p>
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
    
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-black/90 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <p className="text-gray-400 text-sm font-medium mb-2">Total de Clientes</p>
              <p className="text-4xl font-bold text-white">{totalClients}</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <p className="text-gray-400 text-sm font-medium mb-2">Clientes Ativos</p>
              <p className="text-4xl font-bold text-emerald-400">{activeClients}</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
              <p className="text-gray-400 text-sm font-medium mb-2">MRR (Recorrente)</p>
              <p className="text-4xl font-bold text-orange-400">R$ {mrr.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-black font-sans overflow-hidden text-gray-100">
      <aside className={`w-64 bg-black border-r border-white/10 flex flex-col transition-all duration-300 z-20 ${sidebarOpen ? 'translate-x-0 absolute inset-y-0 left-0' : '-translate-x-full absolute md:relative md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Globe size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Hub central</h1>
          </div>
          <button className="md:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button onClick={() => { setView('dashboard'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><LayoutDashboard size={20} /><span className="font-medium">Dashboard</span></button>
          <button onClick={() => { setView('analytics'); setSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${view === 'analytics' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><BarChart3 size={20} /><span className="font-medium">Analytics</span></button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold shrink-0">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium text-white truncate">{user.displayName || 'Usuário'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="text-gray-400 hover:text-red-400 transition-colors p-1" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-black/90">
        <header className="bg-black border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0 z-10 gap-4">
          <div className="flex items-center flex-1">
            <button className="md:hidden mr-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            {view === 'dashboard' && (
              <div className="flex items-center w-full max-w-md relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder-gray-500" />
              </div>
            )}
            {view === 'analytics' && <h2 className="text-xl font-semibold text-white">Métricas</h2>}
          </div>
          <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 shrink-0"><Plus size={18} /><span className="hidden sm:inline">Novo Cliente</span></button>
        </header>

        {loading ? <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div> : (
          view === 'dashboard' ? renderDashboard() : renderAnalytics()
        )}
      </main>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveClient} onDelete={handleDeleteClient} initialData={editingClient} />
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
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  if (!user) {
    return <Auth />;
  }

  return <CRM user={user} />;
}
