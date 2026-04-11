import React from 'react';
import { Users, BarChart3, DollarSign, Calendar } from 'lucide-react';

interface MetricsGridProps {
  activeClients: number;
  mrr: number;
  overdueAmount: number;
  expectedThisMonth: number;
  role?: string;
}

export default function MetricsGrid({ 
  activeClients, 
  mrr, 
  overdueAmount, 
  expectedThisMonth,
  role 
}: MetricsGridProps) {
  const isFinancialRestricted = role !== 'Administrador' && 
                                role !== 'Gerente' && 
                                !['FinOps', 'Controladoria', 'Revenue Operations', 'Gestor de Faturamento'].includes(role || '');

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFinancialRestricted ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-4 mb-8`}>
      <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg hover:border-emerald-500/30 transition-colors">
        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl mr-4">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Clientes Ativos</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeClients}</h3>
        </div>
      </div>
      
      {!isFinancialRestricted && (
        <>
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl mr-4">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">MRR (Recorrente)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {mrr.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-red-500/20 text-red-400 rounded-xl mr-4">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Inadimplência</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {overdueAmount.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-primary-500/20 text-primary-400 rounded-xl mr-4">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">A Receber (Mês)</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">R$ {expectedThisMonth.toFixed(2).replace('.', ',')}</h3>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
