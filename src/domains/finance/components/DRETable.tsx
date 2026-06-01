import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useTransactions, useTransactionCategories } from '@/hooks/queries/useFinance';
import { ChevronDown, ChevronRight, DollarSign, Building, Receipt } from 'lucide-react';
import { Transaction, TransactionCategory } from '@/types';
import { useAuth } from '@auth/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

export default function DRETable() {
  const { data: transactionsData } = useTransactions();
  const transactions = transactionsData || [];
  const { data: categoriesData } = useTransactionCategories();
  const transactionCategories = categoriesData || [];
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [drillDown, setDrillDown] = useState<{ categoryName: string; month: number } | null>(null);

  const { userProfile } = useAuth();
  const orgId = userProfile?.orgId;

  const [profiles, setProfiles] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    if (!orgId) return;

    // Buscar perfis para folha de pagamento automatizada
    const profilesQuery = query(collection(db, 'profiles'), where('orgId', '==', orgId));
    const unsubscribeProfiles = onSnapshot(profilesQuery, (snap) => {
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setProfiles(list);
    });

    // Buscar preferências fiscais da organização
    const prefRef = doc(db, 'organizations', orgId, 'settings', 'preferences');
    const unsubscribePref = onSnapshot(prefRef, (snap) => {
      if (snap.exists()) {
        setPreferences(snap.data());
      }
    });

    return () => {
      unsubscribeProfiles();
      unsubscribePref();
    };
  }, [orgId]);

  const toggleRow = (categoryName: string) => {
    setExpandedRows(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  const currentYear = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1));
  
  // Cálculo mensal das despesas de folha reais com base nos contratos/benefícios cadastrados
  const monthlyPersonnelExpenses = useMemo(() => {
    const expenses = Array(12).fill(0);
    if (!profiles.length) return expenses;

    profiles.forEach(p => {
      const base = p.salary || 0;
      const benefits = (p.healthInsurance || 0) + (p.mealVoucher || 0) + (p.transportVoucher || 0) + (p.homeOfficeAux || 0);
      
      let monthlyCost = base + benefits;
      if (p.contractType === 'CLT') {
        const provs = base * (0.08 + 0.0833 + 0.1111 + 0.032); // FGTS 8%, 13º 8.33%, Férias 11.11%, Multa FGTS 3.2%
        monthlyCost += provs;
      }

      // Se tiver startDate, só conta nos meses a partir da data de início
      let startMonth = 0;
      if (p.startDate) {
        try {
          const startDateObj = new Date(p.startDate);
          if (startDateObj.getFullYear() === currentYear) {
            startMonth = startDateObj.getMonth();
          } else if (startDateObj.getFullYear() > currentYear) {
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      for (let m = startMonth; m < 12; m++) {
        expenses[m] += monthlyCost;
      }
    });

    return expenses;
  }, [profiles, currentYear]);

  // Pré-cálculo da receita bruta mensal para impostos
  const monthlyGrossRevenue = useMemo(() => {
    const revenue = Array(12).fill(0);
    (transactions || []).forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== currentYear) return;
      const monthIdx = date.getMonth();
      if (t.type === 'INCOME') {
        revenue[monthIdx] += t.amount;
      }
    });
    return revenue;
  }, [transactions, currentYear]);

  // Cálculo de impostos de faturamento mensais com base no regime tributário ativo da empresa e Fator R
  const monthlyTaxes = useMemo(() => {
    const taxes = Array(12).fill(0);
    const regime = preferences?.companyRegime || 'Simples Nacional III';

    for (let m = 0; m < 12; m++) {
      const revenue = monthlyGrossRevenue[m];
      if (revenue <= 0) continue;

      let taxAmount = 0;
      if (regime === 'MEI') {
        taxAmount = 75.00; // DAS MEI fixo
      } else if (regime === 'Simples Nacional III') {
        taxAmount = revenue * 0.06; // 6%
      } else if (regime === 'Simples Nacional V') {
        // Regra do Fator R: se folha / faturamento >= 28%, cai para Anexo III (6%), senão 15.5%
        const personnelCost = monthlyPersonnelExpenses[m];
        const ratio = personnelCost / revenue;
        const taxRate = ratio >= 0.28 ? 0.06 : 0.155;
        taxAmount = revenue * taxRate;
      } else if (regime === 'Lucro Presumido') {
        taxAmount = revenue * 0.15; // 15%
      }
      taxes[m] = taxAmount;
    }

    return taxes;
  }, [monthlyGrossRevenue, preferences, monthlyPersonnelExpenses]);

  const aggregated = useMemo(() => {
    const data: any = { Receitas: {}, Despesas: {}, Deducoes: {} };
    
    (transactions || []).forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() !== currentYear) return;
      const monthIdx = date.getMonth();
      const cat = transactionCategories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name : (t.categoryName || 'Sem Categoria');
      
      const group = t.type === 'INCOME' ? 'Receitas' : 'Despesas';
      
      if (!data[group][catName]) data[group][catName] = Array(12).fill(0);
      data[group][catName][monthIdx] += t.amount;

      // Se for Receita e tiver taxa de gateway, somamos nas deduções
      if (t.type === 'INCOME' && t.gatewayFee) {
        if (!data.Deducoes['Taxas Gateway']) data.Deducoes['Taxas Gateway'] = Array(12).fill(0);
        data.Deducoes['Taxas Gateway'][monthIdx] += t.gatewayFee;
      }
    });

    // Injetar Despesas de Pessoal & Folha (Automático)
    const hasFolha = monthlyPersonnelExpenses.some(v => v > 0);
    if (hasFolha) {
      data.Despesas['Despesas de Pessoal & Folha (Automático)'] = monthlyPersonnelExpenses;
    }

    // Injetar Impostos (Automático)
    const hasTaxes = monthlyTaxes.some(v => v > 0);
    if (hasTaxes) {
      const label = `Imposto sobre Faturamento (${preferences?.companyRegime || 'Simples Nacional III'})`;
      data.Deducoes[label] = monthlyTaxes;
    }
    
    return data;
  }, [transactions, transactionCategories, currentYear, monthlyPersonnelExpenses, monthlyTaxes, preferences]);

  const drillDownTransactions = useMemo(() => {
    if (!drillDown) return [];
    return transactions.filter(t => {
      const date = new Date(t.date);
      const cat = transactionCategories.find(c => c.id === t.categoryId);
      return cat?.name === drillDown.categoryName && 
             date.getFullYear() === currentYear && 
             date.getMonth() === drillDown.month;
    });
  }, [drillDown, transactions, transactionCategories, currentYear]);

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
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
          ))}
        </tr>

        {expandedRows[groupName] && Object.entries(items).map(([subcat, values]) => (
          <tr key={subcat} className="border-b border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200/50 dark:hover:bg-white/10 transition-colors">
            <td className="py-2 px-4 pl-10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
              {subcat}
            </td>
            {values.map((val, i) => (
              <td 
                key={i} 
                className={`py-2 px-4 text-right cursor-pointer hover:font-bold hover:underline ${val > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                onClick={() => setDrillDown({ categoryName: subcat, month: i })}
              >
                R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            ))}
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
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
              
              {/* Seção de Deduções */}
              {Object.keys(aggregated.Deducoes).length > 0 && (
                <React.Fragment>
                  <tr className="bg-orange-500/10 border-b border-orange-500/20 text-orange-400 font-semibold">
                    <td className="py-3 px-4">(-) Deduções sobre Vendas</td>
                    {Array(12).fill(0).map((_, i) => {
                      const totalDeducoes = Object.values(aggregated.Deducoes as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                      return (
                        <td key={i} className="py-3 px-4 text-right">
                          R$ {totalDeducoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                  </tr>
                  {(Object.entries(aggregated.Deducoes) as [string, number[]][]).map(([subcat, values]) => (
                    <tr key={subcat} className="border-b border-white/5 text-gray-500 text-xs italic">
                      <td className="py-2 px-4 pl-10 underline decoration-dotted">{subcat}</td>
                      {values.map((val, i) => (
                        <td key={i} className="py-2 px-4 text-right">
                          R$ {val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              )}

              {renderCategoryGroup('Despesas', aggregated.Despesas)}
              
              <tr className="bg-gray-100 dark:bg-black/40 border-t-2 border-gray-300 dark:border-white/20 font-bold text-gray-900 dark:text-white">
                <td className="py-4 px-4">LUCRO LÍQUIDO</td>
                {Array(12).fill(0).map((_, i) => {
                  const rec = Object.values(aggregated.Receitas as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                  const des = Object.values(aggregated.Despesas as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                  const ded = Object.values(aggregated.Deducoes as Record<string, number[]>).reduce((acc, curr) => acc + curr[i], 0);
                  const lucro = rec - des - ded;
                  return (
                    <td key={i} className={`py-4 px-4 text-right ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {drillDown && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300 bg-white dark:bg-white/5 border border-primary-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Detalhes: {drillDown.categoryName}</h4>
              <p className="text-sm text-gray-500">Lançamentos de {months[drillDown.month].toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <button 
              onClick={() => setDrillDown(null)}
              className="px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium transition-all"
            >
              Fechar Detalhes
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 dark:border-white/5">
                  <th className="pb-3 px-2">Data</th>
                  <th className="pb-3 px-2">Descrição</th>
                  <th className="pb-3 px-2">Cliente / Ref</th>
                  <th className="pb-3 px-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {drillDownTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">Nenhum lançamento encontrado para este período.</td>
                  </tr>
                ) : (
                  drillDownTransactions.map(t => (
                    <tr key={t.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-3 px-2">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{t.description}</td>
                      <td className="py-3 px-2 text-gray-500">
                        {t.clientId ? 'ID Cliente: ' + t.clientId.substring(0, 8) : t.referenceId || '-'}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
