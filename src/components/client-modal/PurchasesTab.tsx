import React from 'react';
import { ShoppingBag, Calendar, ExternalLink, CreditCard } from 'lucide-react';
import { Client, ClientPlan } from '../../types';

interface PurchasesTabProps {
  client: Client;
}

export default function PurchasesTab({ client }: PurchasesTabProps) {
  const purchases = (client.plans || []).filter(p => p.type === 'SINGLE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="text-primary-500" size={20} />
          Histórico de Compras Únicas
        </h3>
      </div>

      {purchases.length === 0 ? (
        <div className="text-center py-12 bg-black/10 rounded-2xl border border-white/5">
          <CreditCard className="mx-auto text-gray-500 mb-4" size={48} />
          <p className="text-gray-400">Nenhuma compra única registrada para este cliente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {purchases.map((purchase) => (
            <div 
              key={purchase.id}
              className="bg-black/20 border border-white/10 rounded-2xl p-6 hover:border-primary-500/30 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
                    <ShoppingBag className="text-primary-500" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">{purchase.name}</h4>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>Comprado em: {new Date(purchase.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-white">
                        <span>R$ {purchase.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    purchase.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {purchase.status === 'Ativo' ? 'PAGO' : purchase.status.toUpperCase()}
                  </span>
                  
                  {purchase.invoiceUrl && (
                    <a 
                      href={purchase.invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-bold transition-colors mt-2"
                    >
                      Ver Fatura <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
