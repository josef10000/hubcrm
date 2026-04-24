import React from 'react';
import { 
  CreditCard, 
  Clock, 
  ExternalLink,
  ShoppingBag,
  Calendar,
  RefreshCw,
  Package,
  Zap
} from 'lucide-react';
import { Client, ClientPlan } from '../../types';

interface PlansTabProps {
  client: Partial<Client>;
  onUpdate?: (updatedPlans: ClientPlan[]) => void;
  orgId?: string;
}

export default function PlansTab({ client }: PlansTabProps) {
  const plans = (client.plans || []).filter(p => p.type === 'SUBSCRIPTION');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="text-primary-500" size={20} />
            Assinaturas Ativas
          </h3>
          <p className="text-xs text-gray-500">Serviços recorrentes vinculados a este card específico.</p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-black/20 border border-white/5 rounded-2xl p-10 text-center">
          <RefreshCw className="mx-auto text-gray-700 mb-4" size={48} />
          <p className="text-gray-500 italic">Este card não possui assinaturas recorrentes vinculadas.</p>
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
                    <RefreshCw className="w-6 h-6" />
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
                        <span className="text-[10px] text-gray-600 font-bold">/ MÊS</span>
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
          Resumo do Serviço (Dados Gerais)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Produto Principal</span>
            <span className="text-white font-bold">{client.plan || 'Nenhum'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Valor do Plano</span>
            <span className="text-white font-bold">R$ {(client.planPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Status do Card</span>
            <span className={`font-bold ${client.status === 'Ativo' ? 'text-emerald-400' : 'text-amber-400'}`}>{client.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
