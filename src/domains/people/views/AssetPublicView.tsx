import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ShieldCheck, 
  Laptop, 
  Monitor, 
  Smartphone, 
  Armchair, 
  MousePointer2, 
  Zap, 
  User, 
  Briefcase, 
  Calendar, 
  Cpu, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { Asset } from '@/types/people';

const CATEGORY_ICONS = {
  Notebook: Laptop,
  Hardware: Laptop,
  Monitor: Monitor,
  Software: Monitor,
  Celular: Smartphone,
  Cadeira: Armchair,
  Periférico: MousePointer2,
  Acesso: Zap,
  Outro: Zap
};

export default function AssetPublicView() {
  const { orgId, assetId } = useParams<{ orgId: string; assetId: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAsset() {
      if (!orgId || !assetId) {
        setError('Link inválido ou incompleto.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'organizations', orgId, 'assets', assetId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setAsset({ id: docSnap.id, ...docSnap.data() } as Asset);
        } else {
          setError('O equipamento solicitado não foi encontrado no registro.');
        }
      } catch (err: any) {
        console.error('[AssetPublicView] Erro ao ler ativo:', err);
        setError('Ocorreu um erro ao carregar as informações deste ativo corporativo.');
      } finally {
        setLoading(false);
      }
    }

    loadAsset();
  }, [orgId, assetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-12 w-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            Consultando Registro de Patrimônio...
          </p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center backdrop-blur-2xl shadow-2xl animate-in zoom-in-95">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ops! Registro não encontrado</h2>
          <p className="text-sm text-gray-400 mb-6">{error || 'Verifique o QR Code ou tente novamente.'}</p>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest border-t border-white/5 pt-4">
            Hub CRM — Sistema de Patrimônio
          </div>
        </div>
      </div>
    );
  }

  const IconComponent = CATEGORY_ICONS[asset.category as keyof typeof CATEGORY_ICONS] || Zap;
  const isAssigned = asset.status === 'Em uso' && asset.assignedTo;

  return (
    <div className="min-h-screen bg-[#030712] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background gradients decorativos */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-xl bg-white/5 backdrop-blur-2xl border border-white/10 p-8 sm:p-10 rounded-[3rem] shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
        
        {/* Cabeçalho do Card */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/5 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-500/10 text-primary-400 rounded-2xl">
              <ShieldCheck size={26} />
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-black uppercase bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-md tracking-wider">
                Patrimônio Verificado
              </span>
              <h1 className="text-xl font-bold text-white mt-1">Identificação de Equipamento</h1>
            </div>
          </div>
          <div className="font-mono text-xs font-bold text-primary-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            {asset.assetCode || 'CRM-AST-UNKNOWN'}
          </div>
        </div>

        {/* Detalhes do Equipamento */}
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-white/5 border border-white/5 text-gray-300 rounded-[1.5rem] mt-0.5">
              <IconComponent size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                {asset.category}
              </span>
              <h2 className="text-2xl font-black text-white truncate mt-0.5">{asset.name}</h2>
              {asset.serialNumber && (
                <p className="text-xs text-gray-400 font-mono mt-1">S/N: {asset.serialNumber}</p>
              )}
            </div>
          </div>

          {/* Especificações Técnicas e Compra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {asset.purchaseDate && (
              <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center gap-3">
                <Calendar size={18} className="text-indigo-400" />
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Data de Aquisição</p>
                  <p className="text-sm font-semibold text-white">
                    {new Date(asset.purchaseDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            )}

            {asset.condition && (
              <div className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center gap-3">
                <ShieldCheck size={18} className="text-emerald-400" />
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Estado do Item</p>
                  <p className="text-sm font-semibold text-white">{asset.condition}</p>
                </div>
              </div>
            )}
          </div>

          {asset.specifications && (
            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-2">
                <Cpu size={12} /> Especificações Técnicas
              </p>
              <p className="text-sm text-gray-300 leading-relaxed font-medium">
                {asset.specifications}
              </p>
            </div>
          )}

          {/* Dados do Colaborador Associado (Posse) */}
          <div className="border-t border-white/5 pt-6 mt-8">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1 mb-4">
              Custódia / Responsabilidade
            </h3>

            {isAssigned ? (
              <div className="bg-primary-500/5 border border-primary-500/10 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-400 font-bold border border-primary-500/20 shadow-inner overflow-hidden">
                    <User size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Atribuído
                    </span>
                    <h4 className="text-lg font-bold text-white mt-0.5">{asset.assignedToName}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-400" />
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">Cargo</p>
                      <p className="text-xs text-white font-medium">{asset.assignedToJobTitle || 'Colaborador'}</p>
                    </div>
                  </div>
                  {asset.assignedAt && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Entregue em</p>
                        <p className="text-xs text-white font-medium font-mono">
                          {new Date(asset.assignedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Sob Custódia da Empresa</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Este equipamento encontra-se atualmente em estoque para atribuição.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé institucional */}
        <div className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-widest border-t border-white/5 pt-6 mt-8">
          Sincronizado via Hub CRM Corporativo
        </div>
      </div>
    </div>
  );
}
