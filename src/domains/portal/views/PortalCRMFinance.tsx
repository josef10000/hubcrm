import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, updateDoc, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { 
  DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Phone, Filter, Plus, Trash2, TrendingDown, X
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalCRMFinanceProps {
  orgId: string;
  clientId: string;
}

interface Expense {
  id: string;
  clientId: string;
  description: string;
  value: number;
  category: string;
  date: string;
  status: 'paid' | 'unpaid';
  createdAt: any;
}

export default function PortalCRMFinance({ orgId, clientId }: PortalCRMFinanceProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Controle de abas e filtros
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'last_month' | 'all'>('month');
  const [subTab, setSubTab] = useState<'revenues' | 'expenses'>('revenues');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid'>('all');
  
  // Modal de despesas
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseValue, setExpenseValue] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Aluguel');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().substring(0, 10));
  const [expenseStatus, setExpenseStatus] = useState<'paid' | 'unpaid'>('paid');
  const [savingExpense, setSavingExpense] = useState(false);

  // Escuta agendamentos em tempo real
  useEffect(() => {
    if (!orgId) return;
    const appointmentsRef = collection(db, 'organizations', orgId, 'appointments');
    const q = query(appointmentsRef, orderBy('date', 'desc'), orderBy('time', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((app: any) => app.clientId === clientId); // Garante que lê apenas os agendamentos deste cliente
      setAppointments(list);
    });
    return () => unsub();
  }, [orgId, clientId]);

  // Escuta despesas em tempo real
  useEffect(() => {
    if (!orgId || !clientId) return;
    const expensesRef = collection(db, 'organizations', orgId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Expense))
        .filter(exp => exp.clientId === clientId);
      setExpenses(list);
    });
    return () => unsub();
  }, [orgId, clientId]);

  // Helpers de comparação temporal
  const isToday = (dateStr: string) => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localTodayStr = new Date(today.getTime() - tzOffset).toISOString().substring(0, 10);
    return dateStr === localTodayStr;
  };

  const isThisWeek = (dateStr: string) => {
    const today = new Date();
    const appDate = new Date(dateStr + 'T12:00:00');
    
    // Domingo da semana atual
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // Sábado da semana atual
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return appDate >= startOfWeek && appDate <= endOfWeek;
  };

  const isThisMonth = (dateStr: string) => {
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    return dateStr.substring(0, 7) === currentMonthStr;
  };

  const isLastMonth = (dateStr: string) => {
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const lastMonthStr = today.toISOString().substring(0, 7);
    return dateStr.substring(0, 7) === lastMonthStr;
  };

  const filterByPeriod = (item: any) => {
    if (!item.date || item.status === 'cancelled') return false;
    
    switch (filterPeriod) {
      case 'today':
        return isToday(item.date);
      case 'week':
        return isThisWeek(item.date);
      case 'month':
        return isThisMonth(item.date);
      case 'last_month':
        return isLastMonth(item.date);
      case 'all':
      default:
        return true;
    }
  };

  // Filtragem dos dados consolidados pelo período
  const appointmentsFiltered = appointments.filter(filterByPeriod);
  const expensesFiltered = expenses.filter(filterByPeriod);

  // Cálculos contábeis (Receitas)
  const totalProjetado = appointmentsFiltered.reduce((acc, app) => acc + (app.price || 0), 0);
  
  const totalPago = appointmentsFiltered
    .filter(app => app.paymentStatus === 'paid')
    .reduce((acc, app) => acc + (app.price || 0), 0);

  const totalPendente = appointmentsFiltered
    .filter(app => app.paymentStatus !== 'paid')
    .reduce((acc, app) => acc + (app.price || 0), 0);

  const ticketMedio = appointmentsFiltered.length > 0 
    ? totalProjetado / appointmentsFiltered.length 
    : 0;

  // Cálculos contábeis (Despesas)
  const totalExpenses = expensesFiltered.reduce((acc, exp) => acc + (exp.value || 0), 0);

  // Lucro Líquido = Receitas Recebidas (Efetivadas) - Despesas Totais
  const lucroLiquido = totalPago - totalExpenses;

  // Alteração de status de pagamento do agendamento
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

  // Alteração de status do gasto/despesa
  const handleToggleExpenseStatus = async (expId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'expenses', expId), {
        status: nextStatus
      });
      toast.success(`Gasto marcado como ${nextStatus === 'paid' ? 'Pago' : 'Pendente'}`);
    } catch (e) {
      toast.error('Erro ao atualizar status do gasto.');
    }
  };

  // Deleção de despesa
  const handleDeleteExpense = async (expId: string) => {
    if (!window.confirm('Deseja realmente excluir este registro de gasto?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'expenses', expId));
      toast.success('Gasto removido com sucesso.');
    } catch (e) {
      toast.error('Erro ao remover despesa.');
    }
  };

  // Criação de nova despesa
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseValue || !expenseDate) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setSavingExpense(true);
    try {
      await addDoc(collection(db, 'organizations', orgId, 'expenses'), {
        clientId,
        description: expenseDesc.trim(),
        value: parseFloat(expenseValue.replace(',', '.')),
        category: expenseCategory,
        date: expenseDate,
        status: expenseStatus,
        createdAt: new Date()
      });

      toast.success('Gasto cadastrado com sucesso!');
      setIsExpenseModalOpen(false);
      
      // Limpa formulário
      setExpenseDesc('');
      setExpenseValue('');
      setExpenseCategory('Aluguel');
      setExpenseDate(new Date().toISOString().substring(0, 10));
      setExpenseStatus('paid');
    } catch (err) {
      toast.error('Erro ao salvar despesa.');
      console.error(err);
    } finally {
      setSavingExpense(false);
    }
  };

  // Filtragem da listagem de Receitas para a tabela
  const filteredAppointments = appointments.filter(app => {
    if (!filterByPeriod(app)) return false;
    if (filterPayment === 'paid') return app.paymentStatus === 'paid';
    if (filterPayment === 'unpaid') return app.paymentStatus !== 'paid';
    return true;
  });

  // Filtragem da listagem de Despesas para a tabela
  const filteredExpenses = expenses.filter(exp => {
    if (!filterByPeriod(exp)) return false;
    if (filterPayment === 'paid') return exp.status === 'paid';
    if (filterPayment === 'unpaid') return exp.status !== 'paid';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Abas de Filtro de Período Temporal com efeito Glass */}
      <div className="flex flex-wrap gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        {[
          { id: 'today', label: 'Hoje' },
          { id: 'week', label: 'Esta Semana' },
          { id: 'month', label: 'Este Mês' },
          { id: 'last_month', label: 'Mês Passado' },
          { id: 'all', label: 'Geral' }
        ].map(period => (
          <button
            key={period.id}
            onClick={() => setFilterPeriod(period.id as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
              filterPeriod === period.id 
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>

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
          <p className="text-[10px] text-gray-500 mt-1 italic">Total agendado no período</p>
        </div>

        {/* Card 2: Valor Efetivado (Recebido) */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-emerald-500 group-hover:scale-110 transition-transform">
            <CheckCircle size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Receitas Recebidas</span>
            <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle size={14} /></span>
          </div>
          <p className="text-2xl font-black text-emerald-400">R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-emerald-500/80 mt-1 font-bold">Total de entradas pagas</p>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-5 text-red-500 group-hover:scale-110 transition-transform">
            <TrendingDown size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Despesas Registradas</span>
            <span className="p-1 bg-red-500/10 text-red-400 rounded-lg"><TrendingDown size={14} /></span>
          </div>
          <p className="text-2xl font-black text-red-400">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-red-400/80 mt-1 font-bold">Total de saídas registradas</p>
        </div>

        {/* Card 4: Lucro Líquido */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-5 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
          <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform ${lucroLiquido >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            <TrendingUp size={80} />
          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lucro Líquido Real</span>
            <span className={`p-1 rounded-lg ${lucroLiquido >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <TrendingUp size={14} />
            </span>
          </div>
          <p className={`text-2xl font-black ${lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-500 mt-1 italic">Entradas (pagas) menos saídas</p>
        </div>
      </div>

      {/* Seção Principal Contábil */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="text-primary-400" size={20} />
              Controle Contábil
            </h2>
            <p className="text-xs text-gray-400">Gerencie a saúde financeira da sua microempresa registrando receitas e gastos.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de visualização (Receitas vs Despesas) */}
            <div className="flex p-1 bg-black/40 border border-white/10 rounded-xl">
              <button
                onClick={() => { setSubTab('revenues'); setFilterPayment('all'); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  subTab === 'revenues' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Receitas
              </button>
              <button
                onClick={() => { setSubTab('expenses'); setFilterPayment('all'); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  subTab === 'expenses' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Despesas
              </button>
            </div>

            {/* Botão de Novo Gasto (Apenas na aba Despesas) */}
            {subTab === 'expenses' && (
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <Plus size={14} />
                Registrar Gasto
              </button>
            )}
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/15" />

        {/* Filtros de Pagamento da Tabela */}
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
            {subTab === 'revenues' ? 'Pagos' : 'Gastos Pagos'}
          </button>
          <button
            onClick={() => setFilterPayment('unpaid')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
              filterPayment === 'unpaid' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            {subTab === 'revenues' ? 'Pendentes' : 'Gastos Pendentes'}
          </button>
        </div>

        {/* Renderização da Tabela de Receitas */}
        {subTab === 'revenues' && (
          filteredAppointments.length === 0 ? (
            <div className="py-16 text-center bg-black/20 border border-white/5 rounded-2xl">
              <DollarSign size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nenhum Registro de Receita</p>
              <p className="text-[11px] text-gray-600 mt-1">Nenhum agendamento de cliente atende a este filtro.</p>
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
          )
        )}

        {/* Renderização da Tabela de Despesas */}
        {subTab === 'expenses' && (
          filteredExpenses.length === 0 ? (
            <div className="py-16 text-center bg-black/20 border border-white/5 rounded-2xl">
              <TrendingDown size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nenhum Registro de Gasto</p>
              <p className="text-[11px] text-gray-600 mt-1">Registre as despesas da sua empresa clicando em "Registrar Gasto".</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider font-mono">
                    <th className="pb-3 font-semibold">Data</th>
                    <th className="pb-3 font-semibold">Categoria</th>
                    <th className="pb-3 font-semibold">Descrição</th>
                    <th className="pb-3 font-semibold">Valor</th>
                    <th className="pb-3 font-semibold">Situação</th>
                    <th className="pb-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 text-xs font-medium font-mono text-gray-300">
                        {exp.date ? new Date(exp.date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          exp.category === 'Aluguel' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          exp.category === 'Maquinário' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          exp.category === 'Ferramentas' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          exp.category === 'Insumos' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                          'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-white">
                        {exp.description}
                      </td>
                      <td className="py-4 text-xs font-bold text-red-400 font-mono">
                        - R$ {exp.value?.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleToggleExpenseStatus(exp.id, exp.status)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer active:scale-95 transition-all ${
                            exp.status === 'paid' 
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {exp.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all cursor-pointer active:scale-90 inline-flex items-center justify-center"
                          title="Excluir despesa"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal Glassmorphism de Novo Gasto */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsExpenseModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="mb-6 text-left">
              <h3 className="text-xl font-bold text-white mb-1">Registrar Gasto</h3>
              <p className="text-xs text-gray-400 font-medium">Informe a saída financeira para ajustar o lucro líquido da empresa.</p>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-left">
              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descrição do Gasto</label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ex: Compra de insumos capilares"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Valor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor (R$)</label>
                  <input
                    type="text"
                    value={expenseValue}
                    onChange={(e) => setExpenseValue(e.target.value)}
                    placeholder="150,00"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500 font-mono"
                    required
                  />
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Categoria</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500"
                    required
                  >
                    <option value="Aluguel" className="bg-[#050505]">Aluguel</option>
                    <option value="Maquinário" className="bg-[#050505]">Maquinário</option>
                    <option value="Ferramentas" className="bg-[#050505]">Ferramentas</option>
                    <option value="Insumos" className="bg-[#050505]">Insumos</option>
                    <option value="Outros" className="bg-[#050505]">Outros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Data */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data de Vencimento/Pagamento</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500"
                    required
                  />
                </div>

                {/* Situação */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Situação</label>
                  <select
                    value={expenseStatus}
                    onChange={(e) => setExpenseStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500"
                    required
                  >
                    <option value="paid" className="bg-[#050505]">Pago</option>
                    <option value="unpaid" className="bg-[#050505]">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-white/10 cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {savingExpense ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Salvar Gasto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
