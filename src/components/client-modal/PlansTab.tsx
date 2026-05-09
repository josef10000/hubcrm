import React from 'react';
import { 
  CreditCard, 
  Clock, 
  ExternalLink,
  ShoppingBag,
  Calendar,
  RefreshCw,
  Package,
  Zap,
  Users
} from 'lucide-react';
import { Client, ClientPlan } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface PlansTabProps {
  client: Partial<Client>;
  onUpdate?: (updatedPlans: ClientPlan[]) => void;
  orgId?: string;
}

export default function PlansTab({ client, orgId }: PlansTabProps) {
  const [linkedPlans, setLinkedPlans] = React.useState<any[]>([]);
  const [isLoadingLinked, setIsLoadingLinked] = React.useState(false);

  React.useEffect(() => {
    const fetchLinkedCards = async () => {
      if (!client.whatsapp && !client.email) return;
      setIsLoadingLinked(true);
      try {
        const clientsRef = collection(db, 'organizations', orgId!, 'clients');
        
        // Buscamos por whatsapp
        let otherCards: any[] = [];
        if (client.whatsapp) {
          const q = query(clientsRef, where('whatsapp', '==', client.whatsapp));
          const querySnapshot = await getDocs(q);
          otherCards = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        }

        // Buscamos por e-mail e fazemos o merge
        if (client.email) {
          const qEmail = query(clientsRef, where('email', '==', client.email));
          const emailSnap = await getDocs(qEmail);
          const emailCards = emailSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          
          const existingIds = new Set(otherCards.map(c => c.id));
          emailCards.forEach(c => {
            if (!existingIds.has(c.id)) otherCards.push(c);
          });
        }
        
        setLinkedPlans(otherCards.filter(d => d.id !== client.id));
      } catch (err) {
        console.error("Erro ao buscar cards vinculados:", err);
      } finally {
        setIsLoadingLinked(false);
      }
    };

    if (orgId && (client.whatsapp || client.email)) fetchLinkedCards();
  }, [client.whatsapp, client.email, client.id, orgId]);

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

      {/* Linked Cards (Aggregation) */}
      {linkedPlans.length > 0 && (
        <div className="mt-8 space-y-4 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 text-primary-400 font-bold text-sm uppercase tracking-widest">
            <Users size={16} />
            Outros Serviços (Assinados em outros Cards)
          </div>
          <div className="grid grid-cols-1 gap-3">
            {linkedPlans.map(linked => (
              <div key={linked.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-primary-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                    <Package size={20} />
                  </div>
                  <div>
                    <h5 className="text-white font-bold">{linked.plan || 'Serviço s/ nome'}</h5>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">ID: {linked.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                    linked.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                  }`}>
                    {linked.status.toUpperCase()}
                  </span>
                  <button 
                    onClick={() => window.open(`/dashboard/clients/${linked.id}`, '_blank')}
                    className="p-2 bg-white/5 hover:bg-primary-500 hover:text-white rounded-xl text-gray-400 transition-all border border-white/5"
                    title="Abrir Card"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
