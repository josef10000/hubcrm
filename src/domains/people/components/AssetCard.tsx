import React, { useState } from 'react';
import { Trash2, User, Monitor, Laptop, Key, HelpCircle, QrCode, FileText, X } from 'lucide-react';
import { Asset } from '@/types/people';
import { format } from 'date-fns';
import { useCRM } from '@crm/contexts/CRMContext';
import AssetQrCodeModal from './AssetQrCodeModal';

interface AssetCardProps {
  asset: Asset;
  user: any;
  isAdminOrManager: boolean;
  onDelete: (id: string) => void;
  templates?: any[];
  onGenerateTerm?: (assetId: string, userId: string, templateId: string) => Promise<void>;
}

export function AssetCard({ asset, user, isAdminOrManager, onDelete, templates = [], onGenerateTerm }: AssetCardProps) {
  const crm = useCRM();
  const [selectedQrAsset, setSelectedQrAsset] = useState<Asset | null>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const getCategoryIcon = (category: Asset['category']) => {
    switch (category) {
      case 'Hardware': return Laptop;
      case 'Software': return Monitor;
      case 'Acesso': return Key;
      default: return HelpCircle;
    }
  };

  const Icon = getCategoryIcon(asset.category);

  // Filtrar templates específicos de termos se houver, senão dar fallback para todos
  const assetTemplates = templates.filter(t => t.type === 'asset_term');
  const displayedTemplates = assetTemplates.length > 0 ? assetTemplates : templates;

  return (
    <div className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-[2rem] shadow-xl group hover:border-primary-500 transition-all flex flex-col justify-between min-h-[220px] relative">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl bg-primary-500/10 text-primary-500`}>
            <Icon size={24} />
          </div>
          <div className="flex items-center gap-2">
            {isAdminOrManager && asset.status === 'Em uso' && asset.assignedTo && !asset.contractId && (
              <button 
                onClick={() => setShowTemplateSelect(true)} 
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                title="Gerar Termo de Responsabilidade"
              >
                <FileText size={18} />
              </button>
            )}
            {isAdminOrManager && asset.status === 'Em uso' && (
              <button 
                onClick={() => setSelectedQrAsset(asset)} 
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-xl transition-all"
                title="Ver QR Code / Imprimir"
              >
                <QrCode size={18} />
              </button>
            )}
            {isAdminOrManager && (
              <button 
                onClick={() => onDelete(asset.id)} 
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                title="Remover Ativo"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
        <h4 className="font-bold text-lg mb-1 dark:text-white">{asset.name}</h4>
        <p className="text-xs text-gray-400 mb-4 font-mono">{asset.assetCode || asset.serialNumber || 'Sem código'}</p>
        {asset.serialNumber && asset.assetCode && (
          <p className="text-[10px] text-gray-500 mb-4">S/N: {asset.serialNumber}</p>
        )}
      </div>
      
      <div className="flex items-center gap-3 p-3 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 mt-auto">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
          {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={16} className="text-gray-400" />}
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-bold truncate dark:text-white">{user?.displayName || asset.assignedToName || 'Em estoque'}</p>
          <p className="text-[10px] text-gray-500">
            {asset.assignedAt ? `Atribuído em ${format(new Date(asset.assignedAt), 'dd/MM/yyyy')}` : 'Disponível'}
          </p>
        </div>
        <span className={`ml-auto text-[9px] font-black px-2 py-1 rounded-lg ${
          asset.status === 'Em uso' ? 'bg-emerald-500/10 text-emerald-500' : 
          asset.status === 'Estoque' ? 'bg-blue-500/10 text-blue-500' :
          asset.status === 'Manutenção' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {(asset.status || 'Devolvido').toUpperCase()}
        </span>
      </div>

      {/* Exibir selo de Termo Gerado se já tiver contractId */}
      {asset.contractId && (
        <div className="absolute top-4 left-18 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
          ✓ Termo Enviado
        </div>
      )}

      {selectedQrAsset && (
        <AssetQrCodeModal 
          isOpen={!!selectedQrAsset} 
          onClose={() => setSelectedQrAsset(null)} 
          asset={selectedQrAsset} 
          orgId={crm?.effectiveOrgId || ''} 
        />
      )}

      {showTemplateSelect && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTemplateSelect(false)}>
          <div className="bg-white dark:bg-[#1a1c1e] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-gray-200 dark:border-white/10 scale-in-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                Gerar Termo de Ativo
              </h4>
              <button onClick={() => setShowTemplateSelect(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mb-4">
              Selecione o modelo do Termo de Responsabilidade para enviar para <strong>{user?.displayName || asset.assignedToName}</strong>:
            </p>

            <select
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3.5 rounded-xl text-xs focus:outline-none focus:border-primary-500 transition-all font-medium dark:text-white mb-4"
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Selecione um modelo...</option>
              {displayedTemplates.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title} {t.type !== 'asset_term' ? '(Contrato)' : ''}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplateSelect(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-white/5 text-gray-500 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={!selectedTemplateId}
                onClick={async () => {
                  if (onGenerateTerm && asset.assignedTo) {
                    await onGenerateTerm(asset.id, asset.assignedTo, selectedTemplateId);
                    setShowTemplateSelect(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                Gerar Termo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
