import React, { useState, useMemo } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function DRETable() {
  const { transactions, transactionCategories } = useCRM();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (categoryName: string) => {
    setExpandedRows(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  // Process data to group by Month and Category
  // Simplified mock logic for DRE Structure (Receita, Custos, Despesas, Lucro)
  
  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));
  
  // Aggregate transactions
  // This is a minimal structure for demonstration
  const aggregated = useMemo(() => {
    const data: any = { Receitas: {}, Despesas: {} };
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== currentYear) return;
      const monthIdx = date.getMonth();
      const cat = transactionCategories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : 'Sem Categoria';
      
      const group = t.type === 'INCOME' ? 'Receitas' : 'Despesas';
      
      if (!data[group][catName]) data[group][catName] = Array(12).fill(0);
      data[group][catName][monthIdx] += t.amount;
    });
    
    return data;
  }, [transactions, transactionCategories, currentYear]);

  const renderCategoryGroup = (groupName: string, items: Record<string, number[]>) => {
    const totalByMonth = Array(12).fill(0);
    Object.values(items).forEach(monthArr => {
      monthArr.forEach((val, i) => totalByMonth[i] += val);
    });

    return (
      <React.Fragment key={groupName}>
        <tr 
          className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 cursor-pointer font-semibold text-gray-900 dark:text-white"
          onClick={() => toggleRow(groupName)}
        >
          <td className="py-3 px-4 flex items-center gap-2">
            {expandedRows[groupName] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {groupName}
          </td>
          {totalByMonth.map((total, i) => (
            <td key={i} className={`py-3 px-4 text-right ${groupName === 'Despesas' ? 'text-red-400' : 'text-emerald-400'}`}>
              R$ {total.toFixed(2)}
            </td>
          ))}
        </tr>

        {expandedRows[groupName] && Object.entries(items).map(([subcat, values]) => (
          <tr key={subcat} className="border-b border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-white/5">
            <td className="py-2 px-4 pl-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              {subcat}
            </td>
            {values.map((val, i) => (
              <td key={i} className="py-2 px-4 text-right">
                R$ {val.toFixed(2)}
              </td>
            ))}
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6 overflow-hidden">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">DRE Gerencial - {currentYear}</h3>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm font-medium">
              <th className="pb-3 px-4">Categoria</th>
              {months.map((m, i) => (
                <th key={i} className="pb-3 px-4 text-right">{m.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderCategoryGroup('Receitas', aggregated.Receitas)}
            {renderCategoryGroup('Despesas', aggregated.Despesas)}
            {/* Margem / Lucro Líquido Simplificado */}
            <tr className="bg-gray-100 dark:bg-black/40 border-t-2 border-gray-300 dark:border-white/20 font-bold text-gray-900 dark:text-white">
              <td className="py-4 px-4">LUCRO LÍQUIDO</td>
              {Array(12).fill(0).map((_, i) => {
                const rec = Object.values(aggregated.Receitas as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                const des = Object.values(aggregated.Despesas as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                const lucro = rec - des;
                return (
                  <td key={i} className={`py-4 px-4 text-right ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R$ {lucro.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
