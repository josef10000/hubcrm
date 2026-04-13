import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, User, Search, Monitor, Laptop, Key, HelpCircle, PlusCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useCRM } from '../../contexts/CRMContext';
import { Asset } from '../../types/people';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';

export default function AssetManager() {
  const { userProfile } = useAuth();
  const { effectiveOrgId, teamProfiles } = useCRM();
  const isAdminOrManager = userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    category: 'Hardware',
    status: 'Em uso'
  });

  useEffect(() => {
    if (!effectiveOrgId) return;
    const q = query(collection(db, 'organizations', effectiveOrgId, 'assets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
      setAssets(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [effectiveOrgId]);

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrManager) {
      toast.error('Apenas Administradores ou Gerentes podem gerenciar ativos.');
      return;
    }
    if (!newAsset.name || !newAsset.assignedTo) {
      toast.error('Preencha o nome e o colaborador.');
      return;
    }
    try {
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'assets'), {
        ...newAsset,
        assignedAt: Date.now(),
        orgId: effectiveOrgId
      });
      setShowAddModal(false);
      setNewAsset({ category: 'Hardware', status: 'Em uso' });
      toast.success('Ativo registrado com sucesso!');
    } catch (error) {
      toast.error('Erro ao registrar ativo.');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!isAdminOrManager) {
      toast.error('Apenas Administradores ou Gerentes podem remover ativos.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'assets', id));
      toast.success('Ativo removido.');
    } catch (error) {
      toast.error('Erro ao remover ativo.');
    }
  };

  const getCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'Hardware': return Laptop;
      case 'Software': return Monitor;
      case 'Acesso': return Key;
      default: return HelpCircle;
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teamProfiles.find(p => p.uid === a.assignedTo)?.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar ativos, serial ou colaborador..." 
            className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 pl-12 pr-4 py-3 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {isAdminOrManager && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 w-full md:w-auto justify-center"
          >
            <Plus size={20} /> Atribuir Ativo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => {
          const Icon = getCategoryIcon(asset.category);
          const user = teamProfiles.find(p => p.uid === asset.assignedTo);
          return (
            <div key={asset.id} className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-[2rem] shadow-xl group hover:border-primary-500 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-primary-500/10 text-primary-500`}>
                  <Icon size={24} />
                </div>
                {isAdminOrManager && (
                  <button onClick={() => handleDeleteAsset(asset.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <h4 className="font-bold text-lg mb-1 dark:text-white">{asset.name}</h4>
              <p className="text-xs text-gray-400 mb-4">{asset.serialNumber || 'Sem serial'}</p>
              
              <div className="flex items-center gap-3 p-3 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                  {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={16} className="text-gray-400" />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate dark:text-white">{user?.displayName || 'Desconhecido'}</p>
                  <p className="text-[10px] text-gray-500">Atribuído em {format(asset.assignedAt, 'dd/MM/yyyy')}</p>
                </div>
                <span className={`ml-auto text-[9px] font-black px-2 py-1 rounded-lg ${asset.status === 'Em uso' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {asset.status.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
        {filteredAssets.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center opacity-40">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhum ativo encontrado.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-[#1a1c1e] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-200 dark:border-white/10 scale-in-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
              <PlusCircle className="text-primary-500" /> Novo Ativo
            </h3>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Nome do Ativo</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Ex: Macbook Pro M1"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                  value={newAsset.name || ''}
                  onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Número de Série (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: ABC123XYZ"
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                  value={newAsset.serialNumber || ''}
                  onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Categoria</label>
                  <select 
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                    value={newAsset.category}
                    onChange={e => setNewAsset({...newAsset, category: e.target.value as any})}
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Acesso">Acesso</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Status</label>
                  <select 
                    className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                    value={newAsset.status}
                    onChange={e => setNewAsset({...newAsset, status: e.target.value as any})}
                  >
                    <option value="Em uso">Em uso</option>
                    <option value="Devolvido">Devolvido</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 mb-1 block">Atribuir a</label>
                <select 
                  required
                  className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 rounded-2xl text-sm focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white"
                  value={newAsset.assignedTo || ''}
                  onChange={e => setNewAsset({...newAsset, assignedTo: e.target.value})}
                >
                  <option value="">Selecione um colaborador</option>
                  {teamProfiles.map(p => (
                    <option key={p.uid} value={p.uid}>{p.displayName}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-gray-200 dark:bg-white/5 text-gray-500 hover:bg-gray-300 dark:hover:bg-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl font-bold bg-primary-500 text-white shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
