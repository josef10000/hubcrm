import React from 'react';
import { Package, Edit2, Trash2, Plus, RefreshCw } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';

export default function ProductsView() {
  const { 
    offers, 
    setEditingOffer, 
    setIsOfferModalOpen, 
    setOfferToDelete, 
    setIsDeleteOfferConfirmOpen, 
    restoreDefaultOffers 
  } = useCRM();

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-black/20 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Package className="mr-2 text-primary-500" size={20} />
            Ofertas e Produtos
          </h3>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Gerencie as ofertas disponíveis para seus clientes. Elas aparecerão na hora de criar um novo cliente.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <div key={offer.id} className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-primary-500/50 transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{offer.name}</h4>
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${offer.active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-500/20 text-gray-500'}`}>
                        {offer.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Tipo:</span> {offer.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Pagamento Único'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Exibição:</span> {
                          offer.displayContext === 'CHECKOUT' ? 'Apenas Checkout' : 
                          offer.displayContext === 'BOTH' ? 'CRM e Checkout' : 'Apenas CRM (Manual)'
                        }
                      </p>
                      {offer.order !== undefined && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Ordem de Exibição:</span> {offer.order}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Preço:</span> R$ {(offer.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {offer.type === 'SUBSCRIPTION' && offer.setupPrice !== undefined && offer.setupPrice > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Setup:</span> R$ {(offer.setupPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {offer.type === 'SINGLE' && offer.maxInstallments && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Parcelamento:</span> Até {offer.maxInstallments}x
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button 
                      onClick={() => { setEditingOffer(offer); setIsOfferModalOpen(true); }}
                      className="p-2 text-gray-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-primary-500/10"
                      title="Editar Oferta"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => { setOfferToDelete(offer.id); setIsDeleteOfferConfirmOpen(true); }}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                      title="Excluir Oferta"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex mt-6 gap-3">
              <button
                onClick={() => { setEditingOffer(null); setIsOfferModalOpen(true); }}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-600 text-gray-900 dark:text-white rounded-xl transition-all font-medium shadow-lg shadow-primary-500/20 hover:scale-105 active:scale-95"
              >
                <Plus size={18} />
                Novo Produto
              </button>
              <button
                onClick={restoreDefaultOffers}
                className="flex items-center gap-2 px-5 py-3 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl transition-all font-medium border border-gray-200 dark:border-white/10"
              >
                <RefreshCw size={18} />
                Restaurar Padrões
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
