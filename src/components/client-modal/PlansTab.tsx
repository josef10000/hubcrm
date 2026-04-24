import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink,
  Zap,
  ShoppingBag,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Package,
  Loader2,
  X
} from 'lucide-react';
import { Client, ClientPlan, Offer } from '../../types';
import { authFetch } from '../../lib/authFetch';
import { db } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { toast } from 'sonner';

interface PlansTabProps {
  client: Partial<Client>;
  offers: Offer[];
  onUpdate: (updatedPlans: ClientPlan[]) => void;
  orgId: string;
}

export default function PlansTab({ client, offers, onUpdate, orgId }: PlansTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const plans = client.plans || [];

  const handleAddProduct = async (offer: Offer) => {
    if (!client.id) return;

    setIsCreating(true);
    try {
      const isSubscription = offer.type === 'SUBSCRIPTION';
      const action = isSubscription ? 'subscriptions' : 'payment-links';
      
      const payload: any = {
        customer: client.asaasCustomerId,
        value: offer.price + (offer.setupPrice || 0),
        description: `Contratação: ${offer.name}`,
      };

      if (isSubscription) {
        payload.cycle = 'MONTHLY';
        payload.nextDueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      } else {
        payload.name = offer.name;
        payload.chargeType = 'DETACHED';
      }

      const response = await authFetch(`/api/asaas?action=${action}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao criar no Asaas');

      const asaasData = await response.json();
      const invoiceUrl = asaasData.invoiceUrl || asaasData.url;

      const newPlan: ClientPlan = {
        id: asaasData.id,
        offerId: offer.id,
        name: offer.name,
        type: offer.type,
        price: offer.price,
        status: 'Pendente',
        invoiceUrl: invoiceUrl,
        asaasSubscriptionId: isSubscription ? asaasData.id : undefined,
        asaasPaymentId: !isSubscription ? asaasData.id : undefined,
        createdAt: Date.now()
      };

      const clientRef = doc(db, 'organizations', orgId, 'clients', client.id);
      await updateDoc(clientRef, {
        plans: arrayUnion(newPlan)
      });

      onUpdate([...plans, newPlan]);
      setShowAddForm(false);
      toast.success(`${offer.name} adicionado com sucesso!`);
      
      // Abrir link de pagamento em nova aba
      window.open(invoiceUrl, '_blank');

    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error('Erro ao adicionar produto: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredOffers = offers.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="text-primary-500" size={20} />
            Produtos e Serviços
          </h3>
          <p className="text-xs text-gray-500">Gerencie todos os serviços contratados por este cliente.</p>
        </div>
        <button 
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Cancelar' : 'Vender Novo Produto'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white/5 border border-primary-500/20 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6 bg-black/20 px-4 py-3 rounded-xl border border-white/5">
            <Search size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar no catálogo de ofertas..."
              className="bg-transparent border-none text-sm text-white focus:ring-0 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredOffers.length === 0 ? (
              <div className="col-span-full py-10 text-center text-gray-500 italic">
                Nenhuma oferta encontrada para sua busca.
              </div>
            ) : (
              filteredOffers.map(offer => (
                <div 
                  key={offer.id}
                  className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-primary-500/50 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                        offer.type === 'SUBSCRIPTION' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {offer.type === 'SUBSCRIPTION' ? 'Recorrente' : 'Pagamento Único'}
                      </span>
                      <span className="text-sm font-black text-white">
                        R$ {offer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <h5 className="font-bold text-white text-sm mb-1">{offer.name}</h5>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{offer.description}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleAddProduct(offer)}
                    disabled={isCreating}
                    className="mt-4 w-full py-2 bg-primary-500/10 hover:bg-primary-500 text-primary-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {isCreating ? 'Processando...' : 'Adicionar ao Cliente'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-black/20 border border-white/5 rounded-2xl p-10 text-center">
          <ShoppingBag className="mx-auto text-gray-700 mb-4" size={48} />
          <p className="text-gray-500 italic">Este cliente ainda não possui produtos ou serviços adicionais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plans.sort((a, b) => b.createdAt - a.createdAt).map((plan) => (
            <div 
              key={plan.id}
              className="bg-black/20 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    plan.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' : 
                    plan.status === 'Pendente' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {plan.type === 'SUBSCRIPTION' ? <RefreshCw className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-white text-lg flex items-center gap-2">
                      {plan.name}
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black ${
                        plan.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-400' : 
                        plan.status === 'Pendente' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {plan.status}
                      </span>
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <CreditCard size={14} className="text-gray-600" />
                        R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] text-gray-600 font-bold">/ {plan.type === 'SUBSCRIPTION' ? 'MÊS' : 'ÚNICO'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-gray-600" />
                        Contratado em: {new Date(plan.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      {plan.nextDueDate && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-600" />
                          Vencimento: {new Date(plan.nextDueDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {plan.invoiceUrl && (
                    <a 
                      href={plan.invoiceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2"
                    >
                      <ExternalLink size={14} />
                      Link de Pagamento
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legacy Data Summary */}
      <div className="mt-10 p-6 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
        <h4 className="text-sm font-black text-primary-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Zap size={16} />
          Serviço Principal (Contrato Original)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Produto</span>
            <span className="text-white font-bold">{client.plan || 'Nenhum'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Valor Mensal</span>
            <span className="text-white font-bold">R$ {(client.planPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Status Global</span>
            <span className={`font-bold ${client.status === 'Ativo' ? 'text-emerald-400' : 'text-amber-400'}`}>{client.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
