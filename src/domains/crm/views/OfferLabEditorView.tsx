import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, FlaskConical, Target, Package, Sparkles, 
  Lightbulb, ShieldCheck, DollarSign, Layers, PenTool
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { toast } from 'sonner';
import { offerService } from '@/services/offerService';
import { OfferBlueprint, ICP, Product } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function OfferLabEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.orgId;

  const [offer, setOffer] = useState<OfferBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data for selectors
  const [icps, setIcps] = useState<ICP[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (orgId && id) {
      loadOffer();
      loadAuxiliaryData();
    }
  }, [orgId, id]);

  const loadOffer = async () => {
    if (!orgId || !id) return;
    try {
      const data = await offerService.getOffer(orgId, id);
      if (data) {
        setOffer(data);
      } else {
        toast.error('Oferta não encontrada.');
        navigate('/offers');
      }
    } catch (error) {
      console.error('Error loading offer:', error);
      toast.error('Erro ao carregar oferta.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    if (!orgId) return;
    try {
      // Load ICPs
      const icpsSnap = await getDocs(collection(db, 'organizations', orgId, 'icps'));
      const icpsData = icpsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ICP));
      setIcps(icpsData);

      // Load Products
      const productsSnap = await getDocs(collection(db, 'organizations', orgId, 'products'));
      const productsData = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(productsData);
    } catch (error) {
      console.error("Erro ao carregar dados auxiliares:", error);
    }
  };

  const handleSave = async () => {
    if (!orgId || !id || !offer) return;
    setSaving(true);
    try {
      await offerService.updateOffer(orgId, id, offer);
      toast.success('Oferta salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar oferta:', error);
      toast.error('Erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (offer && !loading) {
        handleSave();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [offer]);

  const handleChange = (field: keyof OfferBlueprint, value: string) => {
    setOffer(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading || !offer) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const selectedICP = icps.find(i => i.id === offer.icpId);
  const selectedProduct = products.find(p => p.id === offer.productId);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header Panel */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/offers')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-indigo-500" />
            <input
              type="text"
              value={offer.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 w-64 md:w-96"
              placeholder="Nome do Experimento / Oferta"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={offer.status}
            onChange={(e) => handleChange('status', e.target.value as any)}
            className="bg-gray-100 dark:bg-gray-700 border-none text-sm rounded-lg px-3 py-1.5 outline-none text-gray-700 dark:text-gray-200"
          >
            <option value="draft">Rascunho</option>
            <option value="validating">Em Teste</option>
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </select>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Context (ICP & Product) */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produto Base
            </h3>
            <select
              value={offer.productId}
              onChange={(e) => handleChange('productId', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 dark:text-white"
            >
              <option value="">Selecione um Produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedProduct && (
              <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{selectedProduct.description || 'Produto sem descrição.'}</p>
              </div>
            )}
          </div>

          <div className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Público Alvo (ICP)
            </h3>
            <select
              value={offer.icpId}
              onChange={(e) => handleChange('icpId', e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none text-gray-900 dark:text-white"
            >
              <option value="">Selecione um ICP...</option>
              {icps.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>

            {selectedICP && (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-800/30">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2 uppercase">Dores / Problemas</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedICP.painPoints || 'Nenhuma dor cadastrada.'}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 uppercase">Desejos / Sonhos</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedICP.goals || 'Nenhum desejo cadastrado.'}</p>
                </div>
              </div>
            )}
            
            {!selectedICP && (
              <div className="mt-4 p-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <p className="text-xs text-gray-500">Selecione um ICP para ver suas dores e guiar a criação da oferta.</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: The Blueprint */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 lg:p-10">
          <div className="max-w-3xl mx-auto space-y-8">
            
            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">A Grande Promessa</h2>
              </div>
              <textarea
                value={offer.promise}
                onChange={(e) => handleChange('promise', e.target.value)}
                placeholder="Ex: Te ajudo a faturar R$10k em 30 dias sem precisar investir em anúncios..."
                className="w-full h-24 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </section>

            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4 text-indigo-500">
                <PenTool className="w-5 h-5" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mecanismo Único</h2>
              </div>
              <textarea
                value={offer.mechanism}
                onChange={(e) => handleChange('mechanism', e.target.value)}
                placeholder="Qual é o segredo ou método exclusivo? Ex: Método Máquina de Vendas 3.0"
                className="w-full h-20 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </section>

            <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4 text-blue-500">
                <Layers className="w-5 h-5" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Entregáveis & Bônus (O Stack)</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">O que ele recebe? (Entregáveis Principais)</label>
                  <textarea
                    value={offer.deliverables}
                    onChange={(e) => handleChange('deliverables', e.target.value)}
                    placeholder="- 4 Encontros ao vivo\n- Acesso à plataforma por 1 ano\n- Suporte via WhatsApp"
                    className="w-full h-28 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Quais são os Bônus?</label>
                  <textarea
                    value={offer.bonuses}
                    onChange={(e) => handleChange('bonuses', e.target.value)}
                    placeholder="Bônus 1: Template de Vendas (Valor: R$ 500)\nBônus 2:..."
                    className="w-full h-28 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                  <DollarSign className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ancoragem & Preço</h2>
                </div>
                <textarea
                  value={offer.pricingAnchoring}
                  onChange={(e) => handleChange('pricingAnchoring', e.target.value)}
                  placeholder="Se fosse comprar tudo separado daria R$ 5.000...\n\nMas hoje, por apenas: R$ 997 à vista"
                  className="w-full h-28 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </section>

              <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-rose-500">
                  <ShieldCheck className="w-5 h-5" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Garantia (Risco Zero)</h2>
                </div>
                <textarea
                  value={offer.guarantee}
                  onChange={(e) => handleChange('guarantee', e.target.value)}
                  placeholder="Garantia Incondicional de 7 dias.\nMais garantia condicional de 90 dias: se aplicar tudo e não tiver resultado, devolvo o dobro."
                  className="w-full h-28 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </section>
            </div>
            
            {/* Espaçamento extra no fim */}
            <div className="h-20"></div>
          </div>
        </div>

        {/* Right Column: Scratchpad & Ideation */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col relative">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Bloco de Ideias
            </h3>
          </div>
          <div className="flex-1 p-0">
            <textarea
              value={offer.scratchpad}
              onChange={(e) => handleChange('scratchpad', e.target.value)}
              placeholder="Cole referências, links da concorrência, brainstorm de copies, objeções do cliente para quebrar na VSL..."
              className="w-full h-full bg-transparent border-none p-5 text-sm text-gray-700 dark:text-gray-300 resize-none outline-none focus:ring-0 leading-relaxed"
            />
          </div>
          
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
             <button className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Gerar Ideias com IA (Em breve)
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
