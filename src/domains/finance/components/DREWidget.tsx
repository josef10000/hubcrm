import React, { useState } from 'react';
import { useCashflowProjections } from '@/hooks/queries/useFinance';
import { formatCurrency } from '@/helpers';
import { ChevronDown, ChevronRight, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DREWidget() {
  const { data: cashflowProjections = [] } = useCashflowProjections();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Pegamos o mês atual dos dados projetados
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentData = cashflowProjections.find(p => p.month === currentMonthKey) || {
    realizedIncome: 0,
    realizedExpense: 0,
    groups: {}
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const dreLines = [
    { name: 'Receita Bruta', key: 'Receita Bruta', type: 'income', bold: true },
    { name: '(-) Deduções e Impostos', key: 'Deduções', type: 'expense' },
    { name: '(=) Receita Líquida', key: 'net_revenue', type: 'calc', bold: true },
    { name: '(-) CMV (Custos Diretos)', key: 'CMV', type: 'expense' },
    { name: '(=) Lucro Bruto', key: 'gross_profit', type: 'calc', bold: true },
    { name: '(-) Despesas Operacionais', key: 'Despesas Operacionais', type: 'expense' },
    { name: '(=) EBITDA', key: 'ebitda', type: 'calc', bold: true },
    { name: '(-) Despesas Não-Operacionais', key: 'Despesas Não-Operacionais', type: 'expense' },
    { name: '(=) Resultado Líquido', key: 'net_income', type: 'calc', bold: true, highlight: true },
  ];

  const calculateLineValue = (key: string) => {
    const groups = currentData.groups || {};
    switch (key) {
      case 'net_revenue':
        return (groups['Receita Bruta'] || 0) - (groups['Deduções'] || 0) - (groups['Impostos'] || 0);
      case 'gross_profit':
        return calculateLineValue('net_revenue') - (groups['CMV'] || 0);
      case 'ebitda':
        return calculateLineValue('gross_profit') - (groups['Despesas Operacionais'] || 0);
      case 'net_income':
        return calculateLineValue('ebitda') - (groups['Despesas Não-Operacionais'] || 0);
      default:
        return groups[key] || 0;
    }
  };

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="text-primary-500" /> DRE Dinâmico (Mês Atual)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Demonstração detalhada de resultados operacional</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resultado do Mês</p>
          <p className={`text-2xl font-black ${calculateLineValue('net_income') >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(calculateLineValue('net_income'))}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-white/5 mb-2">
          <div className="col-span-8">Descrição</div>
          <div className="col-span-4 text-right">Valor Realizado</div>
        </div>

        {dreLines.map((line, idx) => {
          const value = calculateLineValue(line.key);
          const isExpandable = line.type !== 'calc';
          const isExpanded = expandedGroups.includes(line.key);

          return (
            <React.Fragment key={line.key}>
              <div 
                onClick={() => isExpandable && toggleGroup(line.key)}
                className={`
                  grid grid-cols-12 gap-4 px-4 py-3 rounded-2xl transition-all cursor-pointer group
                  ${line.bold ? 'bg-gray-50/50 dark:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                  ${line.highlight ? 'bg-primary-500/10 border border-primary-500/20' : ''}
                `}
              >
                <div className="col-span-8 flex items-center gap-2">
                  {isExpandable ? (
                    isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />
                  ) : <div className="w-4" />}
                  <span className={`text-sm ${line.bold ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {line.name}
                  </span>
                </div>
                <div className={`col-span-4 text-right text-sm font-mono ${line.bold ? 'font-bold' : ''} ${line.type === 'expense' ? 'text-red-500' : line.type === 'income' ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                  {line.type === 'expense' && value > 0 ? '-' : ''}{formatCurrency(value)}
                </div>
              </div>

              {/* Drill-down simulated placeholder or sub-items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-10 pr-4 py-2 space-y-2 bg-gray-50/30 dark:bg-black/20 rounded-b-2xl mb-2">
                       <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 italic">
                         <span>Lançamentos agrupados...</span>
                         <button className="text-primary-500 hover:underline font-bold">Ver Todos</button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <ArrowUpRight size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Margem Bruta</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {calculateLineValue('net_revenue') > 0 ? ((calculateLineValue('gross_profit') / calculateLineValue('net_revenue')) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl">
          <div className="flex items-center gap-2 text-primary-500 mb-1">
            <ArrowDownRight size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Margem EBITDA</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {calculateLineValue('net_revenue') > 0 ? ((calculateLineValue('ebitda') / calculateLineValue('net_revenue')) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}
