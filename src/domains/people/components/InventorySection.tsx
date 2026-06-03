import React, { useState } from 'react';
import { 
  Laptop, 
  Monitor, 
  Smartphone, 
  Armchair, 
  MousePointer2, 
  Plus, 
  Trash2, 
  Calendar,
  Zap,
  QrCode
} from 'lucide-react';
import { ToolAsset } from '@/types';
import AssetQrCodeModal from './AssetQrCodeModal';
import { useCRM } from '@crm/contexts/CRMContext';

interface InventorySectionProps {
  inventory: ToolAsset[];
  isAdmin: boolean;
  onAdd?: () => void;
  onRemove?: (id: string) => void;
}

const CATEGORY_ICONS = {
  Notebook: <Laptop size={20} />,
  Monitor: <Monitor size={20} />,
  Celular: <Smartphone size={20} />,
  Cadeira: <Armchair size={20} />,
  Periférico: <MousePointer2 size={20} />,
  Outro: <Zap size={20} />
};

export default function InventorySection({ inventory, isAdmin, onAdd, onRemove }: InventorySectionProps) {
  const crm = useCRM();
  const [selectedQrAsset, setSelectedQrAsset] = useState<ToolAsset | null>(null);

  if (inventory.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/5">
        <Laptop size={40} className="mx-auto text-gray-300 mb-4 opacity-20" />
        <p className="text-gray-500 text-sm mb-6">Nenhum equipamento vinculado a este colaborador.</p>
        {isAdmin && (
          <button 
            onClick={onAdd}
            className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold flex items-center gap-2 mx-auto"
          >
            <Plus size={18} /> Adicionar Ativo
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">Inventário de Ativos</h4>
        {isAdmin && (
          <button 
            onClick={onAdd}
            className="p-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-xl transition-all"
            title="Adicionar Novo Ativo"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inventory.map((asset) => (
          <div key={asset.id} className="p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl hover:border-white/20 transition-all flex items-start gap-4 relative group">
            <div className={`p-3 rounded-2xl bg-white/5 text-primary-500`}>
              {CATEGORY_ICONS[asset.category as keyof typeof CATEGORY_ICONS] || <Zap size={20} />}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md ${
                  asset.condition === 'Novo' ? 'bg-emerald-500/20 text-emerald-500' :
                  asset.condition === 'Bom' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'
                }`}>
                  {asset.condition}
                </span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{asset.category}</span>
              </div>
              <h5 className="font-bold text-white mb-1">{asset.name}</h5>
              {asset.serialNumber && (
                <p className="text-[10px] text-gray-500 font-mono mb-2">S/N: {asset.serialNumber}</p>
              )}
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <Calendar size={10} />
                Atribuído em {asset.assignedAt ? (typeof asset.assignedAt === 'number' ? new Date(asset.assignedAt).toLocaleDateString('pt-BR') : (asset.assignedAt as any).toDate?.()?.toLocaleDateString('pt-BR') || new Date(asset.assignedAt).toLocaleDateString('pt-BR')) : '—'}
              </div>
            </div>

            {isAdmin && (
              <button 
                onClick={() => setSelectedQrAsset(asset)}
                className="absolute bottom-4 right-4 p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Ver QR Code / Imprimir"
              >
                <QrCode size={16} />
              </button>
            )}

            {isAdmin && onRemove && (
              <button 
                onClick={() => onRemove(asset.id)}
                className="absolute top-4 right-4 p-2 text-gray-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                title="Remover Ativo"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedQrAsset && (
        <AssetQrCodeModal 
          isOpen={!!selectedQrAsset} 
          onClose={() => setSelectedQrAsset(null)} 
          asset={selectedQrAsset} 
          orgId={crm?.effectiveOrgId || ''} 
        />
      )}
    </div>
  );
}
