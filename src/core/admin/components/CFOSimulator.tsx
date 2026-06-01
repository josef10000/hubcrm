import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Users, ShieldAlert, Award, 
  HelpCircle, Percent, ArrowRight, RefreshCw, Calculator,
  TrendingDown, CheckCircle, Info, Sparkles
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Building, Save, Settings, Pencil, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface CFOSimulatorProps {
  effectiveOrgId: string;
}

export default function CFOSimulator({ effectiveOrgId }: CFOSimulatorProps) {
  // Abas do simulador: 'colaborador' ou 'socio'
  const [simulatorMode, setSimulatorMode] = useState<'colaborador' | 'socio'>('colaborador');

  // Dados Financeiros Reais do CRM
  const [realCash, setRealCash] = useState(0);
  const [realMRR, setRealMRR] = useState(0);

  // Estados Editáveis para Simulação
  const [simulatedCash, setSimulatedCash] = useState(0);
  const [simulatedMRR, setSimulatedMRR] = useState(0);

  // Estados de Simulação do Colaborador
  const [simulatedNet, setSimulatedNet] = useState<number>(3000);
  const [healthInsurance, setHealthInsurance] = useState<number>(350);
  const [mealVoucher, setMealVoucher] = useState<number>(500);
  const [transportVoucher, setTransportVoucher] = useState<number>(200);
  const [homeOfficeAux, setHomeOfficeAux] = useState<number>(100);
  const [hiringMode, setHiringMode] = useState<'CLT' | 'PJ' | 'compare'>('compare');
  const [companyRegime, setCompanyRegime] = useState<'SIMPLES_III' | 'SIMPLES_V' | 'LUCRO_PRESUMIDO'>('SIMPLES_III');

  // Configurações Fiscais Oficiais (Salvas no Firestore para DRE e Financeiro real)
  const [officialRegime, setOfficialRegime] = useState<'Simples Nacional III' | 'Simples Nacional V' | 'Lucro Presumido' | 'MEI'>('Simples Nacional III');
  const [officialPorte, setOfficialPorte] = useState<'MEI' | 'ME' | 'EPP' | 'LTDA'>('LTDA');
  const [isSavingOfficial, setIsSavingOfficial] = useState(false);
  const [isOfficialLocked, setIsOfficialLocked] = useState<boolean>(true);

  // Estados de Simulação do Sócio / Pró-labore
  const [socioNet, setSocioNet] = useState<number>(6000);
  const [previousPayroll, setPreviousPayroll] = useState<number>(15000); // Folha de pagamento anterior estimada para cálculo de Fator R

  // Carrega Caixa e MRR reais do Firebase e preferências tributárias oficiais
  useEffect(() => {
    if (!effectiveOrgId) return;

    // Assina transações para calcular Caixa atual
    const qTrans = query(collection(db, 'organizations', effectiveOrgId, 'transactions'));
    const unsubTrans = onSnapshot(qTrans, (snap) => {
      let income = 0;
      let expense = 0;
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'INCOME') {
          income += data.amount || 0;
        } else if (data.type === 'EXPENSE') {
          expense += data.amount || 0;
        }
      });
      const balance = income - expense;
      setRealCash(balance);
      setSimulatedCash(balance);
    });

    // Assina clientes para calcular MRR real
    const qClients = query(collection(db, 'organizations', effectiveOrgId, 'clients'), where('status', '==', 'Ativo'));
    const unsubClients = onSnapshot(qClients, (snap) => {
      let mrrSum = 0;
      snap.docs.forEach(doc => {
        const c = doc.data();
        let price = 0;
        if (c.plan === 'PLATINUM') price = 997;
        else if (c.plan === 'GOLD') price = 497;
        else if (c.plan === 'BRONZE') price = 197;
        else price = Number(c.customPrice) || 0;

        if (c.billingCycle === 'YEARLY') {
          mrrSum += price / 12;
        } else {
          mrrSum += price;
        }
      });
      setRealMRR(mrrSum);
      setSimulatedMRR(mrrSum);
    });

    // Assina preferências fiscais oficiais da empresa
    const prefRef = doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences');
    const unsubPref = onSnapshot(prefRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let hasData = false;
        if (data.companyRegime) {
          setOfficialRegime(data.companyRegime);
          hasData = true;
          // Inicializa a simulação para coincidir com o regime oficial
          setCompanyRegime(
            data.companyRegime === 'Simples Nacional V'
              ? 'SIMPLES_V'
              : data.companyRegime === 'Lucro Presumido'
                ? 'LUCRO_PRESUMIDO'
                : 'SIMPLES_III'
          );
        }
        if (data.companyPorte) {
          setOfficialPorte(data.companyPorte);
          hasData = true;
        }
        
        // Se já existem preferências salvas, inicia bloqueado para evitar cliques acidentais
        setIsOfficialLocked(hasData);
      } else {
        setIsOfficialLocked(false);
      }
    });

    return () => {
      unsubTrans();
      unsubClients();
      unsubPref();
    };
  }, [effectiveOrgId]);

  const handleSaveOfficialConfig = async () => {
    setIsSavingOfficial(true);
    try {
      const prefRef = doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences');
      await setDoc(prefRef, {
        companyRegime: officialRegime,
        companyPorte: officialPorte,
        updatedAt: Date.now()
      }, { merge: true });
      toast.success('Configuração fiscal oficial da empresa salva com sucesso!');
      setIsOfficialLocked(true); // Trava novamente após salvar
    } catch (e) {
      toast.error('Erro ao salvar configuração oficial');
      console.error(e);
    } finally {
      setIsSavingOfficial(false);
    }
  };

  // --- MOTOR DE CÁLCULO BRASILEIRO VIGENTE (Gross-up e Encargos) ---
  
  // Teto INSS 2026/vigente aproximado
  const TETO_INSS = 7786.02;

  // Resolvedor matemático de Salário Bruto a partir do Líquido (Gross-up CLT)
  const calculateGrossFromNetCLT = (netSalary: number): number => {
    let gross = netSalary;
    const tolerance = 0.01;
    const maxIterations = 100;
    
    for (let i = 0; i < maxIterations; i++) {
      // INSS Progressivo
      let inss = 0;
      const t1 = 1412.00;
      const t2 = 2666.68;
      const t3 = 4000.03;
      const t4 = TETO_INSS;

      const baseInss = Math.min(gross, t4);
      if (baseInss <= t1) {
        inss = baseInss * 0.075;
      } else if (baseInss <= t2) {
        inss = (t1 * 0.075) + (baseInss - t1) * 0.09;
      } else if (baseInss <= t3) {
        inss = (t1 * 0.075) + ((t2 - t1) * 0.09) + (baseInss - t2) * 0.12;
      } else {
        inss = (t1 * 0.075) + ((t2 - t1) * 0.09) + ((t3 - t2) * 0.12) + (baseInss - t3) * 0.14;
      }

      // IRRF Progressivo
      const baseIrrf = gross - inss;
      let irrf = 0;
      if (baseIrrf <= 2259.20) {
        irrf = 0;
      } else if (baseIrrf <= 2828.65) {
        irrf = (baseIrrf * 0.075) - 169.44;
      } else if (baseIrrf <= 3751.05) {
        irrf = (baseIrrf * 0.15) - 381.44;
      } else if (baseIrrf <= 4664.68) {
        irrf = (baseIrrf * 0.225) - 662.77;
      } else {
        irrf = (baseIrrf * 0.275) - 896.00;
      }
      irrf = Math.max(0, irrf);

      const calculatedNet = gross - inss - irrf;
      const diff = netSalary - calculatedNet;
      if (Math.abs(diff) < tolerance) {
        break;
      }
      gross += diff;
    }
    return Math.round(gross * 100) / 100;
  };

  // Cálculo de Descontos e Encargos CLT
  const getCLTDetails = (netSalary: number) => {
    const gross = calculateGrossFromNetCLT(netSalary);
    
    // Provisões mensais
    const fgts = gross * 0.08;
    const fgtsMulta = fgts * 0.40; // Multa rescisória (40% do FGTS mensal)
    const decimoTerceiro = gross / 12; // 8.33%
    const ferias = (gross / 12) + (gross / 12 / 3); // 11.11% (1/12 de férias + 1/3 adicional)
    
    // Encargos Patronais da Empresa com base no Regime Tributário
    let inssPatronal = 0;
    let ratFap = 0;
    let terceiros = 0;
    
    if (companyRegime === 'LUCRO_PRESUMIDO') {
      inssPatronal = gross * 0.20; // 20%
      ratFap = gross * 0.02; // Média de 2%
      terceiros = gross * 0.058; // Outras entidades 5.8%
    }
    
    const totalEncargos = inssPatronal + ratFap + terceiros;
    const totalProvisoes = fgts + fgtsMulta + decimoTerceiro + ferias;
    
    // Benefícios (Plano de saúde, VR, VA, combustível, etc.)
    const totalBeneficios = healthInsurance + mealVoucher + transportVoucher + homeOfficeAux;
    
    const custoMensalReal = gross + totalEncargos + totalProvisoes + totalBeneficios;
    
    // Descontos do Colaborador (apenas para exibição)
    const baseInssColab = Math.min(gross, TETO_INSS);
    let inssColab = 0;
    if (baseInssColab <= 1412) inssColab = baseInssColab * 0.075;
    else if (baseInssColab <= 2666.68) inssColab = 105.90 + (baseInssColab - 1412) * 0.09;
    else if (baseInssColab <= 4000.03) inssColab = 105.90 + 112.92 + (baseInssColab - 2666.68) * 0.12;
    else inssColab = 105.90 + 112.92 + 160.00 + (baseInssColab - 4000.03) * 0.14;

    const baseIrrfColab = gross - inssColab;
    let irrfColab = 0;
    if (baseIrrfColab <= 2259.20) irrfColab = 0;
    else if (baseIrrfColab <= 2828.65) irrfColab = (baseIrrfColab * 0.075) - 169.44;
    else if (baseIrrfColab <= 3751.05) irrfColab = (baseIrrfColab * 0.15) - 381.44;
    else if (baseIrrfColab <= 4664.68) irrfColab = (baseIrrfColab * 0.225) - 662.77;
    else irrfColab = (baseIrrfColab * 0.275) - 896.00;
    irrfColab = Math.max(0, irrfColab);

    return {
      gross,
      inssColab,
      irrfColab,
      fgts,
      fgtsMulta,
      decimoTerceiro,
      ferias,
      inssPatronal,
      ratFap,
      terceiros,
      totalEncargos,
      totalProvisoes,
      totalBeneficios,
      custoMensalReal
    };
  };

  // Resolvedor PJ (Simples Nacional do prestador de serviços Anexo III - alíquota aproximada de 6%)
  const calculateGrossFromNetPJ = (netSalary: number, taxRate = 0.06): number => {
    return Math.round((netSalary / (1 - taxRate)) * 100) / 100;
  };

  // Cálculo de Descontos e Custos PJ
  const getPJDetails = (netSalary: number) => {
    // Bruto necessário para o PJ receber o líquido desejado após o imposto dele
    const gross = calculateGrossFromNetPJ(netSalary);
    const impostoColab = gross * 0.06; // Estimativa de 6% retido pelo prestador
    
    // Provisões opcionais que o gestor pode estipular no contrato (ex: 15 dias de descanso remunerado por ano = 1/24 por mês, e bônus de Natal = 1/12)
    const provisaoDescanso = gross / 24; 
    const provisaoBonus = gross / 12;
    
    // Benefícios pagos por fora se o gestor quiser
    const totalBeneficios = healthInsurance + mealVoucher + transportVoucher + homeOfficeAux;

    const custoMensalReal = gross + provisaoDescanso + provisaoBonus + totalBeneficios;

    return {
      gross,
      impostoColab,
      provisaoDescanso,
      provisaoBonus,
      totalBeneficios,
      custoMensalReal
    };
  };

  // --- MOTOR DE PRÓ-LABORE & FATOR R ---
  const getSocioDetails = (netSocio: number) => {
    // Sócio desconta 11% de INSS retido (limitado ao teto) + IRRF progressivo
    let gross = netSocio;
    const tolerance = 0.01;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      // INSS Sócio é 11% fixo limitado ao Teto do INSS
      const inss = Math.min(gross * 0.11, TETO_INSS * 0.11);
      
      // IRRF Progressivo
      const baseIrrf = gross - inss;
      let irrf = 0;
      if (baseIrrf <= 2259.20) {
        irrf = 0;
      } else if (baseIrrf <= 2828.65) {
        irrf = (baseIrrf * 0.075) - 169.44;
      } else if (baseIrrf <= 3751.05) {
        irrf = (baseIrrf * 0.15) - 381.44;
      } else if (baseIrrf <= 4664.68) {
        irrf = (baseIrrf * 0.225) - 662.77;
      } else {
        irrf = (baseIrrf * 0.275) - 896.00;
      }
      irrf = Math.max(0, irrf);

      const calculatedNet = gross - inss - irrf;
      const diff = netSocio - calculatedNet;
      if (Math.abs(diff) < tolerance) {
        break;
      }
      gross += diff;
    }

    const inssRetido = Math.min(gross * 0.11, TETO_INSS * 0.11);
    const baseIrrf = gross - inssRetido;
    let irrfRetido = 0;
    if (baseIrrf <= 2259.20) irrfRetido = 0;
    else if (baseIrrf <= 2828.65) irrfRetido = (baseIrrf * 0.075) - 169.44;
    else if (baseIrrf <= 3751.05) irrfRetido = (baseIrrf * 0.15) - 381.44;
    else if (baseIrrf <= 4664.68) irrfRetido = (baseIrrf * 0.225) - 662.77;
    else irrfRetido = (baseIrrf * 0.275) - 896.00;
    irrfRetido = Math.max(0, irrfRetido);

    // INSS Patronal de Pró-labore para Lucro Presumido
    let inssPatronal = 0;
    if (companyRegime === 'LUCRO_PRESUMIDO') {
      inssPatronal = gross * 0.20; // 20% sobre pró-labore
    }

    const custoTotalEmpresa = gross + inssPatronal;

    return {
      gross,
      inssRetido,
      irrfRetido,
      inssPatronal,
      custoTotalEmpresa
    };
  };

  // Processa dados dos detalhes
  const clt = getCLTDetails(simulatedNet);
  const pj = getPJDetails(simulatedNet);
  const socio = getSocioDetails(socioNet);

  // Análise do Fator R (Aba Sócio)
  // Fator R = (Folha de Pagamento nos últimos 12 meses + Pró-labore simulado) / Faturamento nos últimos 12 meses (MRR * 12)
  const simulatedPayrollTotal = previousPayroll + socio.gross;
  const faturamentoAnual = simulatedMRR * 12;
  const fatorRPercentage = faturamentoAnual > 0 ? (simulatedPayrollTotal / simulatedMRR) * 100 : 0;
  const isFatorREligible = fatorRPercentage >= 28;

  // Semáforo de Viabilidade Financeira (Baseado no MRR simulado)
  const getViabilityStatus = (custo: number) => {
    if (simulatedMRR <= 0) return { label: 'Sem dados de receita', color: 'text-gray-400 border-gray-400 bg-gray-500/10' };
    const ratio = (custo / simulatedMRR) * 100;
    if (ratio < 15) return { label: '🟢 Viável & Saudável (Abaixo de 15% do MRR)', color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' };
    if (ratio <= 30) return { label: '🟡 Requer Cuidado (Representa de 15% a 30% do MRR)', color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' };
    return { label: '🔴 Risco Financeiro (Representa mais de 30% do MRR)', color: 'text-rose-500 border-rose-500/20 bg-rose-500/10' };
  };

  // Cálculo de Break-even (Ticket médio estimado de R$ 500/mês se faturamento estiver vago)
  const getBreakEvenCount = (custo: number) => {
    const ticket = realMRR > 0 ? realMRR / 10 : 500; // ticket estimado
    return Math.ceil(custo / ticket);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* Seção 0: Configuração Fiscal Oficial (Persistida para DRE e Financeiro real) */}
      <div className="bg-gradient-to-r from-[#1e293b]/80 to-[#0f172a]/80 backdrop-blur-xl border border-primary-500/20 rounded-[2.5rem] p-6 shadow-2xl text-left relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform text-white">
          <Settings size={100} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Building className="text-primary-500" size={20} />
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Configuração Fiscal Oficial da Empresa
              </h3>
            </div>
            <p className="text-xs text-gray-400">
              Esses dados definem oficialmente o cálculo automático de impostos e encargos trabalhistas na sua DRE.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-500 block ml-1">Porte Jurídico</span>
              <select
                disabled={isOfficialLocked}
                value={officialPorte}
                onChange={e => setOfficialPorte(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-primary-500 font-bold cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <option value="MEI" className="bg-[#0f1117] text-white">MEI (Microempreendedor Individual)</option>
                <option value="ME" className="bg-[#0f1117] text-white">ME (Microempresa)</option>
                <option value="EPP" className="bg-[#0f1117] text-white">EPP (Empresa de Pequeno Porte)</option>
                <option value="LTDA" className="bg-[#0f1117] text-white">LTDA / S.A. (Sociedade Limitada)</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-500 block ml-1">Regime Fiscal</span>
              <select
                disabled={isOfficialLocked}
                value={officialRegime}
                onChange={e => setOfficialRegime(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-primary-500 font-bold cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <option value="MEI" className="bg-[#0f1117] text-white">MEI (DAS Fixo Mensal)</option>
                <option value="Simples Nacional III" className="bg-[#0f1117] text-white">Simples Nacional - Anexo III (6%)</option>
                <option value="Simples Nacional V" className="bg-[#0f1117] text-white">Simples Nacional - Anexo V (15.5%)</option>
                <option value="Lucro Presumido" className="bg-[#0f1117] text-white">Lucro Presumido (~15% total)</option>
              </select>
            </div>

            {isOfficialLocked ? (
              <button
                type="button"
                onClick={() => setIsOfficialLocked(false)}
                className="md:mt-5 flex items-center gap-1.5 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer"
                title="Editar Configuração Fiscal"
              >
                <Pencil size={14} className="text-primary-500" />
                <span>Editar</span>
              </button>
            ) : (
              <button
                onClick={handleSaveOfficialConfig}
                disabled={isSavingOfficial}
                className="md:mt-5 flex items-center gap-1.5 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-primary-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingOfficial ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Salvar Oficial</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1. Indicadores de Saúde Financeira do CRM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Caixa da Empresa */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-white">
            <DollarSign size={80} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Saldo em Caixa Real (CRM)</span>
          <h3 className="text-3xl font-black font-mono tracking-tight text-white mb-2">
            R$ {realCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Simular Caixa:</span>
            <input 
              type="number" 
              value={simulatedCash} 
              onChange={e => setSimulatedCash(Number(e.target.value))} 
              className="bg-transparent border-none text-xs text-primary-400 font-bold font-mono focus:outline-none w-full"
            />
          </div>
        </div>

        {/* MRR Recorrente */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-white">
            <TrendingUp size={80} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">MRR Recorrente Real (CRM)</span>
          <h3 className="text-3xl font-black font-mono tracking-tight text-primary-500 mb-2">
            R$ {realMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-2 mt-4 bg-white/5 p-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Simular MRR:</span>
            <input 
              type="number" 
              value={simulatedMRR} 
              onChange={e => setSimulatedMRR(Number(e.target.value))} 
              className="bg-transparent border-none text-xs text-primary-400 font-bold font-mono focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Seletor de Regime Tributário */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl text-left flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Enquadramento Tributário da Empresa</span>
            <select
              value={companyRegime}
              onChange={e => setCompanyRegime(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-primary-500 transition-all font-bold cursor-pointer mt-2"
            >
              <option value="SIMPLES_III" className="bg-[#0f1117] text-white">Simples Nacional - Anexo III (6%)</option>
              <option value="SIMPLES_V" className="bg-[#0f1117] text-white">Simples Nacional - Anexo V (15.5%)</option>
              <option value="LUCRO_PRESUMIDO" className="bg-[#0f1117] text-white">Lucro Presumido (~15%)</option>
            </select>
          </div>
          <p className="text-[10px] text-gray-500 leading-tight mt-4">
            * O regime tributário da empresa impacta diretamente a taxa de INSS Patronal incidente sobre a contratação (20% no Lucro Presumido).
          </p>
        </div>
      </div>

      {/* 2. Menu de Navegação do CFO Simulator */}
      <div className="flex justify-center p-1 bg-white/5 border border-white/5 rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => setSimulatorMode('colaborador')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
            simulatorMode === 'colaborador'
              ? 'bg-primary-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users size={14} />
          <span>Simulador de Colaboradores</span>
        </button>
        <button
          onClick={() => setSimulatorMode('socio')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
            simulatorMode === 'socio'
              ? 'bg-primary-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Calculator size={14} />
          <span>Pró-labore de Sócios</span>
        </button>
      </div>

      {/* 3. Área 1: Simulador de Colaboradores */}
      {simulatorMode === 'colaborador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          {/* Coluna Esquerda: Configurador de Custos */}
          <div className="lg:col-span-5 bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-primary-500" size={20} />
              Configurar Nova Contratação
            </h3>

            {/* Salário Líquido */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase">Salário Líquido Desejado (Bolso)</label>
                <span className="text-sm font-black font-mono text-primary-400">
                  R$ {simulatedNet.toLocaleString('pt-BR')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25000"
                step="100"
                value={simulatedNet}
                onChange={e => setSimulatedNet(Number(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none"
              />
              <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5 mt-1">
                <span className="text-xs text-gray-500 font-bold uppercase">Editar valor:</span>
                <input 
                  type="number" 
                  value={simulatedNet} 
                  onChange={e => setSimulatedNet(Number(e.target.value))}
                  className="bg-transparent border-none text-xs text-white font-mono font-bold focus:outline-none w-full"
                />
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Benefícios Planejados */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">Benefícios & Auxílios Adicionais</h4>
              
              {/* Plano de Saúde */}
              <div className="flex justify-between items-center gap-4">
                <label className="text-xs text-gray-400 font-bold">Plano de Saúde (Médico/Odonto):</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-[120px]">
                  <span className="text-[10px] text-gray-500 font-bold mr-1">R$</span>
                  <input 
                    type="number" 
                    value={healthInsurance} 
                    onChange={e => setHealthInsurance(Number(e.target.value))}
                    className="bg-transparent border-none text-xs text-white font-mono text-right focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Vale Refeição */}
              <div className="flex justify-between items-center gap-4">
                <label className="text-xs text-gray-400 font-bold">Vale Refeição / Alimentação:</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-[120px]">
                  <span className="text-[10px] text-gray-500 font-bold mr-1">R$</span>
                  <input 
                    type="number" 
                    value={mealVoucher} 
                    onChange={e => setMealVoucher(Number(e.target.value))}
                    className="bg-transparent border-none text-xs text-white font-mono text-right focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Auxílio Combustível / Transporte */}
              <div className="flex justify-between items-center gap-4">
                <label className="text-xs text-gray-400 font-bold">Auxílio Combustível / Vale Transp.:</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-[120px]">
                  <span className="text-[10px] text-gray-500 font-bold mr-1">R$</span>
                  <input 
                    type="number" 
                    value={transportVoucher} 
                    onChange={e => setTransportVoucher(Number(e.target.value))}
                    className="bg-transparent border-none text-xs text-white font-mono text-right focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Auxílio Home Office */}
              <div className="flex justify-between items-center gap-4">
                <label className="text-xs text-gray-400 font-bold">Auxílio Home Office / Internet:</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 max-w-[120px]">
                  <span className="text-[10px] text-gray-500 font-bold mr-1">R$</span>
                  <input 
                    type="number" 
                    value={homeOfficeAux} 
                    onChange={e => setHomeOfficeAux(Number(e.target.value))}
                    className="bg-transparent border-none text-xs text-white font-mono text-right focus:outline-none w-full"
                  />
                </div>
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Visualização de Regime */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase block">Regime Tributário de Simulação</label>
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                <button 
                  onClick={() => setHiringMode('compare')} 
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    hiringMode === 'compare' ? 'bg-primary-500 text-white shadow' : 'text-gray-400'
                  }`}
                >
                  Comparar Ambos
                </button>
                <button 
                  onClick={() => setHiringMode('CLT')} 
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    hiringMode === 'CLT' ? 'bg-primary-500 text-white' : 'text-gray-400'
                  }`}
                >
                  Apenas CLT
                </button>
                <button 
                  onClick={() => setHiringMode('PJ')} 
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    hiringMode === 'PJ' ? 'bg-primary-500 text-white' : 'text-gray-400'
                  }`}
                >
                  Apenas PJ
                </button>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Demonstrativo de Custos & Leis */}
          <div className="lg:col-span-7 space-y-6">
            {/* Comparação Gráfica Dinâmica */}
            {(hiringMode === 'compare' || hiringMode === 'CLT' || hiringMode === 'PJ') && (
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-6">Comparativo de Custo Mensal da Contratação</h3>
                
                <div className="space-y-6">
                  {/* Custo CLT */}
                  {(hiringMode === 'compare' || hiringMode === 'CLT') && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          💼 Regime CLT (Custo Total Real)
                        </span>
                        <span className="font-black text-primary-400 text-sm font-mono">
                          R$ {clt.custoMensalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* Barra CLT */}
                      <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min((clt.custoMensalReal / Math.max(clt.custoMensalReal, pj.custoMensalReal)) * 100, 100)}%` }} 
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-inner rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">
                        * O colaborador recebe R$ {simulatedNet.toLocaleString('pt-BR')} líquidos e necessita de um salário bruto de R$ {clt.gross.toLocaleString('pt-BR')}.
                      </p>
                    </div>
                  )}

                  {/* Custo PJ */}
                  {(hiringMode === 'compare' || hiringMode === 'PJ') && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          🤝 Regime PJ (Custo Total Real)
                        </span>
                        <span className="font-black text-emerald-400 text-sm font-mono">
                          R$ {pj.custoMensalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {/* Barra PJ */}
                      <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min((pj.custoMensalReal / Math.max(clt.custoMensalReal, pj.custoMensalReal)) * 100, 100)}%` }} 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-inner rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-gray-500">
                        * O colaborador recebe R$ {simulatedNet.toLocaleString('pt-BR')} líquidos e necessita de uma NF faturada de R$ {pj.gross.toLocaleString('pt-BR')}.
                      </p>
                    </div>
                  )}

                  {/* Comparativo de Economia */}
                  {hiringMode === 'compare' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mt-4">
                      <p className="text-xs text-emerald-400 font-bold">
                        💡 Contratar como **PJ** gera uma economia imediata de **R$ {(clt.custoMensalReal - pj.custoMensalReal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** por mês (~{Math.round(((clt.custoMensalReal - pj.custoMensalReal) / clt.custoMensalReal) * 100)}% menos oneroso).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ficha Técnica Detalhada: Leis e Provisões CLT */}
            {(hiringMode === 'compare' || hiringMode === 'CLT') && (
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl text-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Info size={16} className="text-primary-500" /> Detalhamento de Provisões e Leis (CLT)
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left leading-relaxed">
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">Salário Bruto (Gross-up):</span>
                    <span className="font-bold font-mono text-white">R$ {clt.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">INSS Retido (Colaborador):</span>
                    <span className="font-bold font-mono text-rose-400">- R$ {clt.inssColab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">IRRF Retido (Colaborador):</span>
                    <span className="font-bold font-mono text-rose-400">- R$ {clt.irrfColab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">Salário Líquido (No Bolso):</span>
                    <span className="font-black font-mono text-emerald-400">R$ {simulatedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Encargos Patronais da Empresa</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">INSS Patronal (20%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.inssPatronal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">RAT/FAP (2%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.ratFap.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Terceiros (5.8%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.terceiros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1 font-bold">
                      <span className="text-gray-300">Total Encargos Patronais:</span>
                      <span className="font-mono text-white">R$ {clt.totalEncargos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Provisões Trabalhistas Obrigatórias</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">FGTS Mensal (8%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.fgts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Multa FGTS Rescisão (3.2%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.fgtsMulta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">13º Salário Proporcional (8.33%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.decimoTerceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Férias Proporcionais + 1/3 (11.11%):</span>
                      <span className="font-bold font-mono text-white">R$ {clt.ferias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1 font-bold">
                      <span className="text-gray-300">Total Provisões Obrigatórias:</span>
                      <span className="font-mono text-white">R$ {clt.totalProvisoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Benefícios Acordados (Não Incide Imposto)</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Total Benefícios Directs:</span>
                      <span className="font-bold font-mono text-white">R$ {clt.totalBeneficios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1 font-bold text-primary-400">
                      <span>CUSTO MENSAL CLT FINAL:</span>
                      <span className="font-mono">R$ {clt.custoMensalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ficha Técnica Detalhada: Leis e Contratos PJ */}
            {(hiringMode === 'compare' || hiringMode === 'PJ') && (
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl text-xs space-y-4">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Info size={16} className="text-emerald-500" /> Detalhamento de Provisões e Contratos (PJ)
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left leading-relaxed">
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">Valor da NF (Bruto):</span>
                    <span className="font-bold font-mono text-white">R$ {pj.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">Imposto Estimado Simples PJ (6%):</span>
                    <span className="font-bold font-mono text-rose-400">- R$ {pj.impostoColab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1">
                    <span className="text-gray-400">Valor Líquido Recebido no Bolso:</span>
                    <span className="font-black font-mono text-emerald-400">R$ {simulatedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Provisões de Segurança Contratuais (Sugestão HubCRM)</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Reserva de Férias PJ (15 dias/ano = ~4.16%):</span>
                      <span className="font-bold font-mono text-white">R$ {pj.provisaoDescanso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Reserva 13º/Bônus PJ (8.33%):</span>
                      <span className="font-bold font-mono text-white">R$ {pj.provisaoBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1 font-bold">
                      <span className="text-gray-300">Total Provisões Contratuais:</span>
                      <span className="font-mono text-white">R$ {(pj.provisaoDescanso + pj.provisaoBonus).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Benefícios e Custo PJ Final</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">Benefícios Opcionais Integrados:</span>
                      <span className="font-bold font-mono text-white">R$ {pj.totalBeneficios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 py-1 font-bold text-emerald-400">
                      <span>CUSTO MENSAL PJ FINAL:</span>
                      <span className="font-mono">R$ {pj.custoMensalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Indicadores de Viabilidade do CRM */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-xl text-left space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Percent size={16} className="text-primary-500" /> Viabilidade e Break-even Financeiro (CRM)
              </h3>
              
              {(() => {
                const targetCusto = hiringMode === 'PJ' ? pj.custoMensalReal : clt.custoMensalReal;
                const status = getViabilityStatus(targetCusto);
                const breakEven = getBreakEvenCount(targetCusto);
                return (
                  <div className="space-y-4">
                    <div className={`p-4 border rounded-2xl text-xs font-bold ${status.color}`}>
                      {status.label}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Break-even Clientes</span>
                        <h4 className="text-2xl font-black text-white font-mono mt-1">+{breakEven}</h4>
                        <p className="text-[9px] text-gray-400 mt-1">Novos clientes no plano médio necessários para cobrir o custo.</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1 block">Impacto Mensal Caixa</span>
                        <h4 className="text-lg font-bold text-white mt-1">-{((targetCusto / Math.max(simulatedCash, 1)) * 100).toFixed(1)}%</h4>
                        <p className="text-[9px] text-gray-400 mt-1">Consumo mensal estimado do caixa disponível acumulado.</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 4. Área 2: Simulador de Pró-labore */}
      {simulatorMode === 'socio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          {/* Coluna Esquerda: Configurador de Pró-labore */}
          <div className="lg:col-span-5 bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="text-primary-500" size={20} />
              Configurar Retirada de Pró-labore
            </h3>

            {/* Salário Líquido Sócio */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase">Valor Líquido Desejado no Bolso</label>
                <span className="text-sm font-black font-mono text-primary-400">
                  R$ {socioNet.toLocaleString('pt-BR')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="35000"
                step="100"
                value={socioNet}
                onChange={e => setSocioNet(Number(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none"
              />
              <div className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5 mt-1">
                <span className="text-xs text-gray-500 font-bold uppercase">Editar valor:</span>
                <input 
                  type="number" 
                  value={socioNet} 
                  onChange={e => setSocioNet(Number(e.target.value))}
                  className="bg-transparent border-none text-xs text-white font-mono font-bold focus:outline-none w-full"
                />
              </div>
            </div>

            <hr className="border-white/5" />

            {/* Parametrização para Fator R */}
            {companyRegime === 'SIMPLES_V' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-xs font-bold">
                  ⚠️ Sua empresa está configurada no **Simples Anexo V**. Podemos atingir os **28% de Fator R** para migrar para o **Anexo III (6%)** de imposto corporativo!
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase block">Folha de Pagamento Anterior de 12m (Média Mensal):</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-2 max-w-full">
                    <span className="text-xs text-gray-500 font-bold mr-1">R$</span>
                    <input 
                      type="number" 
                      value={previousPayroll} 
                      onChange={e => setPreviousPayroll(Number(e.target.value))}
                      className="bg-transparent border-none text-sm text-white font-mono focus:outline-none w-full font-bold"
                      placeholder="Média de salários + pró-labore existentes..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[10px] text-gray-500 leading-relaxed">
              <strong>Entenda as Regras de Pró-labore:</strong><br />
              O pró-labore é a remuneração dos sócios-gerentes sobre a qual incide **INSS Retido de 11%** (respeitando o teto da previdência) e **IRRF progressivo** conforme a tabela da Receita Federal. Diferente da retirada de dividendos (que é isenta de impostos), o pró-labore constitui folha de pagamento para a empresa.
            </div>
          </div>

          {/* Coluna Direita: Demonstrativo Tributário do Sócio e Fator R */}
          <div className="lg:col-span-7 space-y-6">
            {/* Ficha Técnica Detalhada: Pró-labore */}
            <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl text-xs space-y-4">
              <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Info size={16} className="text-primary-500" /> Detalhamento de Tributos do Pró-labore
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left leading-relaxed">
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-gray-400">Pró-labore Bruto Calculado:</span>
                  <span className="font-bold font-mono text-white">R$ {socio.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-gray-400">INSS Retido (11% - Limitado ao teto):</span>
                  <span className="font-bold font-mono text-rose-400">- R$ {socio.inssRetido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-gray-400">IRRF Retido (Tabela Progressiva):</span>
                  <span className="font-bold font-mono text-rose-400">- R$ {socio.irrfRetido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-1">
                  <span className="text-gray-400">Retirada Líquida no Bolso (Sócio):</span>
                  <span className="font-black font-mono text-emerald-400">R$ {socioNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {companyRegime === 'LUCRO_PRESUMIDO' && (
                <div className="mt-4 pt-2 border-t border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Encargo da Empresa sobre o Pró-labore</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 leading-relaxed">
                    <div className="flex justify-between border-b border-white/5 py-1">
                      <span className="text-gray-400">INSS Patronal (20% s/ Pró-labore):</span>
                      <span className="font-bold font-mono text-white">R$ {socio.inssPatronal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between font-bold text-primary-400 border-t border-white/5 pt-3">
                <span>CUSTO MENSAL TOTAL PARA A EMPRESA:</span>
                <span className="font-mono">R$ {socio.custoTotalEmpresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Calculadora do Fator R (Apenas se Simples Nacional V) */}
            {companyRegime === 'SIMPLES_V' && (
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl text-left space-y-4">
                <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                  <Percent size={16} className="text-primary-500" /> Diagnóstico de Fator R (Simples Nacional)
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Métricas de Folha de Pagamento:</span>
                    <span className="font-mono text-white">
                      R$ {simulatedPayrollTotal.toLocaleString('pt-BR')} / R$ {simulatedMRR.toLocaleString('pt-BR')} (Mensal)
                    </span>
                  </div>

                  {/* Barra de Progresso Fator R */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold">Meta de Fator R (Mínimo 28%):</span>
                      <span className={`font-black font-mono ${isFatorREligible ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {fatorRPercentage.toFixed(1)}% / 28.0%
                      </span>
                    </div>
                    <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden relative">
                      <div 
                        style={{ width: `${Math.min(fatorRPercentage, 100)}%` }} 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFatorREligible 
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                            : 'bg-gradient-to-r from-amber-600 to-amber-400'
                        }`}
                      />
                      <div className="absolute top-0 bottom-0 left-[28%] w-0.5 bg-rose-500 z-10" title="Linha de corte: 28%" />
                    </div>
                  </div>

                  {/* Alerta de Elegibilidade */}
                  {isFatorREligible ? (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs font-bold flex items-start gap-2">
                      <CheckCircle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span>🎉 FATOR R ALCANÇADO!</span>
                        <p className="text-[10px] text-emerald-500/80 font-normal leading-tight mt-1">
                          A proporção de folha/pró-labore atingiu {fatorRPercentage.toFixed(1)}%. Com isso, a sua empresa pode tributar os serviços no **Anexo III (alíquota inicial de 6%)** ao invés do Anexo V (15.5%), gerando uma economia de **9.5% de imposto** sobre todo o seu faturamento mensal!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 text-amber-500 rounded-2xl text-xs font-bold flex items-start gap-2">
                      <Info size={16} className="shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span>⚠️ FATOR R ABAIXO DO MÍNIMO ({fatorRPercentage.toFixed(1)}%)</span>
                        <p className="text-[10px] text-amber-500/80 font-normal leading-tight mt-1">
                          Você precisa de mais **R$ {Math.max((simulatedMRR * 0.28) - simulatedPayrollTotal, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}** em pró-labore ou folha de pagamento mensal para atingir a meta de 28%. Aumentar o seu pró-labore simulado para este patamar trará um benefício tributário gigantesco no imposto da empresa!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
