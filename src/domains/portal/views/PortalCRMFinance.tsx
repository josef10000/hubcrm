import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { 
  DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Phone, Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalCRMFinanceProps {
  orgId: string;
  clientId: string;
}

export default function PortalCRMFinance({ orgId, clientId }: PortalCRMFinanceProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Escuta agendamentos em tempo real
  useEffect(() => {
    if (!orgId) return;
    const appointmentsRef = collection(db, 'organizations', orgId, 'appointments');
    const q = query(appointmentsRef, orderBy('date', 'desc'), orderBy('time', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAppointments(list);
    });
    return () => unsub();
  }, [orgId]);

  // Cálculos financeiros do mês atual (baseado em YYYY-MM)
  const currentMonthStr = new Date().toISOString().substring(0, 7); // Ex: "2026-06"

  const appointmentsThisMonth = appointments.filter(app => {
    return app.date && app.date.substring(0, 7) === currentMonthStr && app.status !== 'cancelled';
  });

  const totalProjetado = appointmentsThisMonth.reduce((acc, app) => acc + (app.price || 0), 0);
  
  const totalPago = appointmentsThisMonth
    .filter(app => app.paymentStatus === 'paid')
    .reduce((acc, app) => acc + (app.price || 0), 0);

  const totalPendente = appointmentsThisMonth
    .filter(app => app.paymentStatus !== 'paid')
    .reduce((acc, app) => acc + (app.price || 0), 0);

  const ticketMedio = appointmentsThisMonth.length > 0 
    ? totalProjetado / appointmentsThisMonth.length 
    : 0;

  // Toggle de status de pagamento
  const handleTogglePaymentStatus = async (appId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'appointments', appId), {
        paymentStatus: nextStatus
      });
      toast.success(`Pagamento marcado como ${nextStatus === 'paid' ? 'Pago' : 'Pendente'}`);
    } catch (e) {
      toast.error('Erro ao atualizar status de pagamento.');
    }
  };

  // Filtragem para a tabela
  const filteredAppointments = appointments.filter(app => {
    if (filterPayment === 'paid') return app.paymentStatus === 'paid';
    if (filterPayment === 'unpaid') return app.paymentStatus !== 'paid';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Reativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Projetado */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform">
            <DollarSign size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Faturamento Projetado</span>
            <span className="p-1 bg-primary-500/10 text-primary-400 rounded-lg"><Calendar size={14} /></span>
          </div>
          <p className="text-2xl font-black text-white">R$ {totalProjetado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-gray-500 mt-1 italic">Total agendado para este mês</p>
        </div>

        {/* Card 2: Faturamento Efetivado */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform">
            <CheckCircle size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor Efetivado (Pago)</span>
            <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle size={14} /></span>
          </div>
          <p className="text-2xl font-black text-emerald-400">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-emerald-500/80 mt-1 font-bold">Líquido recebido no mês</p>
        </div>

        {/* Card 3: Valor Pendente */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-amber-500 group-hover:scale-110 transition-transform">
            <AlertCircle size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pendente de Recebimento</span>
            <span className="p-1 bg-amber-500/10 text-amber-400 rounded-lg"><AlertCircle size={14} /></span>
          </div>
          <p className="text-2xl font-black text-amber-400">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-amber-500/80 mt-1 font-bold">Aguardando recebimento</p>
        </div>

        {/* Card 4: Ticket Médio */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ticket Médio</span>
            <span className="p-1 bg-blue-500/10 text-blue-400 rounded-lg"><TrendingUp size={14} /></span>
          </div>
          <p className="text-2xl font-black text-white">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-gray-500 mt-1 italic">Média de faturamento por serviço</p>
        </div>
      </div>

      {/* Tabela de Controle Financeiro de Agendamentos */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="text-primary-400" size={20} />
              Controle Contábil
            </h2>
            <p className="text-xs text-gray-400">Monitore as faturas e clique nos status para registrar pagamentos manualmente.</p>
          </div>

          {/* Filtros de Pagamento */}
          <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-xl w-fit">
            <button
              onClick={() => setFilterPayment('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filterPayment === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterPayment('paid')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filterPayment === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setFilterPayment('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                filterPayment === 'unpaid' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/15" />

        {/* Listagem de Cobranças */}
        {filteredAppointments.length === 0 ? (
          <div className="py-16 text-center bg-black/20 border border-white/5 rounded-2xl">
            <DollarSign size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nenhum Registro Financeiro</p>
            <p className="text-[11px] text-gray-600 mt-1">Nenhum agendamento atende a este filtro de pagamento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-mono">
                  <th className="pb-3 font-semibold">Data / Hora</th>
                  <th className="pb-3 font-semibold">Cliente</th>
                  <th className="pb-3 font-semibold">Serviço</th>
                  <th className="pb-3 font-semibold">Preço</th>
                  <th className="pb-3 font-semibold">Status de Pagamento</th>
                  <th className="pb-3 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((app) => (
                  <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-4 text-xs font-medium font-mono text-gray-300">
                      {app.date ? new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'} &bull; <span className="text-primary-400">{app.time}</span>
                    </td>
                    <td className="py-4 text-xs font-bold text-white">
                      {app.clientName}
                    </td>
                    <td className="py-4 text-xs text-gray-300">
                      {app.serviceName}
                    </td>
                    <td className="py-4 text-xs font-bold text-white font-mono">
                      R$ {app.price?.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-4">
                      <button
                        onClick={() => handleTogglePaymentStatus(app.id, app.paymentStatus)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer active:scale-95 transition-all ${
                          app.paymentStatus === 'paid' 
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {app.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE'}
                      </button>
                    </td>
                    <td className="py-4 text-right">
                      {app.clientPhone && (
                        <a
                          href={`https://wa.me/${app.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <Phone size={12} />
                          WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
