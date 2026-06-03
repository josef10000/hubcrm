import React, { useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { AssetCard } from './AssetCard';
import { AssetFormModal } from './AssetFormModal';

interface AssetManagerProps {
  userId?: string;
}

export default function AssetManager({ userId }: AssetManagerProps) {
  const { 
    assets, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    isAdminOrManager, 
    teamProfiles, 
    createAsset, 
    removeAsset,
    templates,
    generateTermForAsset
  } = useAssets(userId);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        {!userId && (
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
        )}
        
        {isAdminOrManager && (
          <button 
            onClick={() => setShowAddModal(true)}
            className={`bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 w-full md:w-auto justify-center ${userId ? 'ml-auto' : ''}`}
          >
            <Plus size={20} /> Atribuir Ativo
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map(asset => (
          <AssetCard 
            key={asset.id}
            asset={asset}
            user={teamProfiles.find(p => p.uid === asset.assignedTo)}
            isAdminOrManager={isAdminOrManager}
            onDelete={removeAsset}
            templates={templates}
            onGenerateTerm={generateTermForAsset}
          />
        ))}
        {assets.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center opacity-40">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Nenhum ativo encontrado.</p>
          </div>
        )}
      </div>

      <AssetFormModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={createAsset}
        teamProfiles={teamProfiles}
        defaultUserId={userId}
        templates={templates}
      />
    </div>
  );
}
