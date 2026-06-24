import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Clock, AlertTriangle, CheckCircle2, 
  HelpCircle, Settings, User, CreditCard, ChevronDown, 
  ChevronUp, Loader2, ArrowRight, Sparkles, RefreshCw
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, doc, 
  setDoc, onSnapshot, getDoc, updateDoc 
} from 'firebase/firestore';
import { useCRM } from '@crm/contexts/CRMContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface PayrollSettings {
  paymentDay: number;
  accrualStartDay: number;
}

interface PayrollItemCalculated {
  userId: string;
  userName: string;
  contractType: 'CLT' | 'PJ';
  baseSalary: number;
  isResignation: boolean;
  pixKey: string;
  pixKeyType: string;
  bankAccount: any;
  
  // Proventos
  overtimeHours: number;
  overtimeAmount: number;
  commissionsAmount: number;
  benefitsInCash: number;
  otherIncomes: number;
  resignationProventos: {
    salaryBalance: number;
    thirteenthSalary: number;
    vacationsProportional: number;
    vacationsExpired: number;
    noticeIndemnified: number;
    pjPenalty: number;
  };

  // Descontos
  absencesCount: number;
  absencesDeducted: number;
  advancesDeducted: number;
  benefitDeductions: number;
  taxDeductions: number;
  vacationDaysDeducted: number;
  vacationDeductionAmount: number;
  otherExpenses: number;

  netAmount: number;
  status: 'pending' | 'paid' | 'failed';
  errorMessage?: string;
  asaasTransferId?: string;
}

export default function PayrollPanel() {
  const { user, userProfile } = useAuth();
  const { effectiveOrgId } = useCRM();
  const { confirm } = useDialog();

  const [competence, setCompetence] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({
    paymentDay: 5,
    accrualStartDay: 21
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<PayrollSettings>({ paymentDay: 5, accrualStartDay: 21 });

  const [profiles, setProfiles] = useState<any[]>([]);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [payrollItems, setPayrollItems] = useState<PayrollItemCalculated[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processingInBatch, setProcessingInBatch] = useState(false);
  
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Modais de Férias e Rescisão
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacationCalc, setVacationCalc] = useState({
    userId: '',
    vacationId: '',
    days: 30,
    grossAmount: 0,
    oneThird: 0,
    net: 0,
    absencesInPeriod: 0,
    daysAllowed: 30
  });

  const [showResignationModal, setShowResignationModal] = useState(false);
  const [resignationSim, setResignationSim] = useState({
    userId: '',
    date: '',
    reason: 'dismissal_without_cause',
    noticeType: 'none',
    penaltyPercentage: 0,
    salaryBalance: 0,
    thirteenth: 0,
    vacationsProp: 0,
    vacationsExp: 0,
    noticeInd: 0,
    noticeDisc: 0,
    net: 0,
    fgtsPenaltyInfo: 0
  });

  // 1. Carregar Configurações e Dados Iniciais
  useEffect(() => {
    if (!effectiveOrgId) return;

    // Escutar configurações da folha
    const orgRef = doc(db, 'organizations', effectiveOrgId);
    const unsubSettings = onSnapshot(orgRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.payrollSettings) {
          setPayrollSettings(data.payrollSettings);
          setTempSettings(data.payrollSettings);
        }
      }
    });

    // Buscar perfis
    const unsubProfiles = onSnapshot(collection(db, 'profiles'), (snap) => {
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      const orgProfiles = list.filter((p: any) => p.orgId === effectiveOrgId);
      setProfiles(orgProfiles);
    });

    return () => {
      unsubSettings();
      unsubProfiles();
    };
  }, [effectiveOrgId]);

  // 2. Lógica de Janela de Apuração e Vencimento
  const getAccrualWindow = (comp: string, startDay: number, payDay: number) => {
    const [year, month] = comp.split('-').map(Number);
    
    // Início da apuração: dia startDay do mês anterior
    const startDate = new Date(year, month - 2, startDay, 0, 0, 0, 0);
    // Fim da apuração: dia startDay - 1 do mês da competência
    const endDate = new Date(year, month - 1, startDay - 1, 23, 59, 59, 999);
    
    // Data de pagamento: dia payDay do mês seguinte à competência
    const paymentDate = new Date(year, month - 1, payDay, 12, 0, 0, 0);
    if (startDay === 1) {
      // Se a apuração for mensal cheia (1 a 30)
      startDate.setMonth(month - 1);
      startDate.setDate(1);
      endDate.setMonth(month - 1);
      endDate.setDate(new Date(year, month, 0).getDate());
    }

    return {
      startDate,
      endDate,
      paymentDate
    };
  };

  const { startDate, endDate, paymentDate } = getAccrualWindow(competence, payrollSettings.accrualStartDay, payrollSettings.paymentDay);

  // 3. Buscar Dados Transacionais da Janela de Apuração
  useEffect(() => {
    if (!effectiveOrgId || !startDate || !endDate) return;
    setLoading(true);

    const loadData = async () => {
      try {
        const orgRef = doc(db, 'organizations', effectiveOrgId);
        
        // Ponto Eletrônico
        const logsSnap = await getDocs(
          query(
            collection(db, 'organizations', effectiveOrgId, 'time_logs'),
            where('startTime', '>=', startDate.getTime()),
            where('startTime', '<=', endDate.getTime())
          )
        );
        setTimeLogs(logsSnap.docs.map(d => d.data()));

        // Ausências/Férias
        const vacsSnap = await getDocs(collection(db, 'organizations', effectiveOrgId, 'vacations'));
        setVacations(vacsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Adiantamentos
        const advancesSnap = await getDocs(
          query(
            collection(db, 'organizations', effectiveOrgId, 'salary_advances'),
            where('month', '==', competence)
          )
        );
        setAdvances(advancesSnap.docs.map(d => d.data()));

        // Comissões
        const commissionsSnap = await getDocs(
          collection(db, 'organizations', effectiveOrgId, 'commissions')
        );
        setCommissions(commissionsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((c: any) => c.status === 'PENDING'));

      } catch (err) {
        console.error('[PayrollPanel] Erro ao carregar dados:', err);
        toast.error('Erro ao carregar dados da folha');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [effectiveOrgId, competence, payrollSettings]);

  // 4. Executar os Cálculos da Folha
  const calculatePayroll = (silent: boolean = false) => {
    setCalculating(true);
    try {
      const items: PayrollItemCalculated[] = [];

      profiles.forEach(profile => {
        // Ignorar se o colaborador foi desligado ANTES do início da apuração
        if (profile.resignationDetails?.resignationDate) {
          const resDate = new Date(profile.resignationDetails.resignationDate);
          if (resDate < startDate) return;
        }

        const isCLT = profile.contractType === 'CLT';
        const baseSalary = Number(profile.salary) || 0;
        
        // Se não possui salário configurado, ignoramos
        if (baseSalary <= 0) return;

        let isResignation = false;
        let workDaysInPeriod = 30; // base comercial de dias
        
        // Verificar se houve desligamento nesta janela de apuração
        if (profile.resignationDetails?.resignationDate) {
          const resDate = new Date(profile.resignationDetails.resignationDate);
          if (resDate >= startDate && resDate <= endDate) {
            isResignation = true;
            // Calcular dias trabalhados no período até desligamento
            const diffTime = Math.abs(resDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            workDaysInPeriod = Math.min(diffDays, 30);
          }
        }

        // --- PROVENTOS ---
        // 1. Salário Proporcional
        let calcSalary = baseSalary;
        if (isResignation) {
          calcSalary = (baseSalary / 30) * workDaysInPeriod;
        }

        // 2. Horas Extras (time_logs)
        const myLogs = timeLogs.filter(log => log.userId === profile.uid && log.isOvertime);
        const otMinutes = myLogs.reduce((acc, log) => acc + (Number(log.overtimeMinutesRequested) || 0), 0);
        const overtimeHours = otMinutes / 60;
        const overtimeAmount = isCLT ? (baseSalary / 220) * overtimeHours * 1.5 : 0;

        // 3. Comissões
        const myCommissions = commissions.filter(c => c.userId === profile.uid || c.agentId === profile.uid);
        const commissionsAmount = myCommissions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

        // 4. Benefícios pagos em Dinheiro
        // Auxílios em dinheiro integram como proventos (Ex: Auxílio Home Office)
        const benefitsInCash = Number(profile.homeOfficeAux) || 0;

        // Proventos de Rescisão CLT
        let resSalaryBalance = 0;
        let resThirteenth = 0;
        let resVacProp = 0;
        let resVacExp = 0;
        let resNoticeInd = 0;
        let resPjPenalty = 0;

        if (isResignation) {
          resSalaryBalance = calcSalary; // Já é o proporcional
          
          if (isCLT) {
            const admission = profile.startDate ? new Date(profile.startDate) : new Date();
            const dismissal = new Date(profile.resignationDetails.resignationDate);
            const monthsWorkedInYear = dismissal.getMonth() + 1; // Simplificado: 1/12 por mês trabalhado no ano
            resThirteenth = (baseSalary / 12) * monthsWorkedInYear;

            // Férias proporcionais + 1/3 (simplificado: meses desde admissão)
            const totalMonths = (dismissal.getFullYear() - admission.getFullYear()) * 12 + (dismissal.getMonth() - admission.getMonth());
            const activePeriodMonths = totalMonths % 12;
            resVacProp = ((baseSalary / 12) * activePeriodMonths) * 1.3333;

            // Aviso Prévio Indenizado
            if (profile.resignationDetails.noticeType === 'indemnified') {
              resNoticeInd = baseSalary; // 30 dias base
            }
          } else {
            // PJ Penalty
            if (profile.resignationDetails.penaltyPercentage > 0) {
              resPjPenalty = baseSalary * (profile.resignationDetails.penaltyPercentage / 100);
            }
          }
        }

        // --- DESCONTOS ---
        // 1. Faltas
        const myAbsences = vacations.filter(v => 
          v.userId === profile.uid && 
          v.reason === 'Falta' && 
          (v.status === 'Aprovado' || v.status === 'Informado')
        );
        
        let absencesCount = 0;
        myAbsences.forEach(v => {
          const vStart = new Date(v.start);
          const vEnd = new Date(v.end);
          // Calcular dias da falta que caem dentro da apuração
          const startBound = vStart > startDate ? vStart : startDate;
          const endBound = vEnd < endDate ? vEnd : endDate;
          if (startBound <= endBound) {
            const diffTime = Math.abs(endBound.getTime() - startBound.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            absencesCount += diffDays;
          }
        });

        // Cálculo de desconto por falta
        let absencesDeducted = 0;
        if (absencesCount > 0) {
          if (isCLT) {
            // CLT: Desconta dia + DSR (2 dias de desconto por dia de falta)
            absencesDeducted = (baseSalary / 30) * absencesCount * 2;
          } else {
            // PJ: Desconta apenas o dia proporcional
            absencesDeducted = (baseSalary / 30) * absencesCount;
          }
        }

        // 2. Adiantamento Salarial Compensado
        const myAdvances = advances.filter(a => a.userId === profile.uid);
        const advancesDeducted = myAdvances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

        // 3. Coparticipações de Benefícios
        const benefitDeductions = 
          (Number(profile.benefitDeductions?.healthInsuranceCopay) || 0) +
          (Number(profile.benefitDeductions?.mealVoucherDiscount) || 0) +
          (Number(profile.benefitDeductions?.transportVoucherDiscount) || 0);

        // 4. Impostos CLT (INSS + IRRF simplificados)
        let taxDeductions = 0;
        if (isCLT && !isResignation) {
          const gross = baseSalary + overtimeAmount;
          // INSS simplificado de 11%
          const inss = gross * 0.11;
          // IRRF simplificado de 7.5% sobre o excedente de R$ 2.200,00
          const irrf = gross > 2200 ? (gross - 2200) * 0.075 : 0;
          taxDeductions = inss + irrf;
        }

        // 5. Compensação de Férias Gozadas no Mês
        const myVacationsGozadas = vacations.filter(v => 
          v.userId === profile.uid && 
          v.reason === 'Férias' && 
          (v.status === 'Aprovado' || v.status === 'Informado')
        );

        let vacationDaysDeducted = 0;
        myVacationsGozadas.forEach(v => {
          const vStart = new Date(v.start);
          const vEnd = new Date(v.end);
          const startBound = vStart > startDate ? vStart : startDate;
          const endBound = vEnd < endDate ? vEnd : endDate;
          if (startBound <= endBound) {
            const diffTime = Math.abs(endBound.getTime() - startBound.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            vacationDaysDeducted += diffDays;
          }
        });

        const vacationDeductionAmount = (baseSalary / 30) * vacationDaysDeducted;

        // --- CÁLCULO LÍQUIDO FINAL ---
        let netAmount = 0;
        if (isResignation) {
          netAmount = 
            resSalaryBalance + 
            resThirteenth + 
            resVacProp + 
            resVacExp + 
            resNoticeInd + 
            resPjPenalty - 
            (absencesDeducted + advancesDeducted + benefitDeductions);
        } else {
          netAmount = 
            baseSalary + 
            overtimeAmount + 
            commissionsAmount + 
            benefitsInCash - 
            (absencesDeducted + advancesDeducted + benefitDeductions + taxDeductions + vacationDeductionAmount);
        }

        items.push({
          userId: profile.uid,
          userName: profile.displayName || 'Colaborador',
          contractType: profile.contractType || 'PJ',
          baseSalary,
          isResignation,
          pixKey: profile.pixKey || '',
          pixKeyType: profile.pixKeyType || '',
          bankAccount: profile.bankAccount || null,
          
          overtimeHours,
          overtimeAmount,
          commissionsAmount,
          benefitsInCash,
          otherIncomes: 0,
          resignationProventos: {
            salaryBalance: resSalaryBalance,
            thirteenthSalary: resThirteenth,
            vacationsProportional: resVacProp,
            vacationsExpired: resVacExp,
            noticeIndemnified: resNoticeInd,
            pjPenalty: resPjPenalty
          },

          absencesCount,
          absencesDeducted,
          advancesDeducted,
          benefitDeductions,
          taxDeductions,
          vacationDaysDeducted,
          vacationDeductionAmount,
          otherExpenses: 0,

          netAmount: Math.max(netAmount, 0),
          status: 'pending'
        });
      });

      setPayrollItems(items);
      setSelectedItems(items.filter(i => i.pixKey).map(i => i.userId));
      if (!silent) {
        toast.success('Folha calculada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao calcular a folha de pagamento');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (profiles.length > 0 && !loading) {
      calculatePayroll(true);
    }
  }, [profiles, timeLogs, vacations, advances, commissions, loading]);

  // 5. Configurações da Folha
  const handleSaveSettings = async () => {
    if (!effectiveOrgId) return;
    try {
      const orgRef = doc(db, 'organizations', effectiveOrgId);
      await updateDoc(orgRef, {
        payrollSettings: tempSettings
      });
      setPayrollSettings(tempSettings);
      setShowSettingsModal(false);
      toast.success('Configurações da folha salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar configurações da folha');
    }
  };

  // 6. Pagamento da Folha em Lote via Asaas
  const handleProcessPayroll = async () => {
    const itemsToPay = payrollItems.filter(item => selectedItems.includes(item.userId) && item.status !== 'paid');
    
    if (itemsToPay.length === 0) {
      toast.error('Nenhum colaborador pendente selecionado para pagamento.');
      return;
    }

    const confirmPay = await confirm({
      title: 'Confirmar Pagamento',
      message: `Deseja disparar o pagamento Pix via Asaas para ${itemsToPay.length} colaboradores, totalizando R$ ${itemsToPay.reduce((acc, i) => acc + i.netAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`,
      confirmText: 'Sim, Pagar',
      cancelText: 'Cancelar'
    });
    if (!confirmPay) return;

    setProcessingInBatch(true);
    toast.info('Iniciando disparos Pix no Asaas em lote...');

    try {
      const token = await user?.getIdToken();
      let paidCount = 0;
      let failCount = 0;

      // Criação da Folha principal no banco
      const payrollId = `payroll_${competence}_${Date.now()}`;
      const payrollDoc: any = {
        id: payrollId,
        month: competence,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        paymentDate: paymentDate.getTime(),
        status: 'draft',
        totalPaid: 0,
        createdAt: Date.now(),
        items: []
      };

      for (const item of itemsToPay) {
        try {
          const payload: any = {
            value: Number(item.netAmount.toFixed(2)),
            description: `Salário Líquido - ${item.userName} - Competência ${competence}`,
            targetUserId: item.userId,
            type: 'salary'
          };

          if (item.pixKey) {
            payload.pixAddressKey = item.pixKey;
            payload.pixAddressKeyType = item.pixKeyType;
          } else if (item.bankAccount) {
            payload.bankAccount = item.bankAccount;
          } else {
            throw new Error('Chave Pix ou Conta Bancária ausente.');
          }

          const res = await fetch('/api/asaas_handler?action=transfer', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro na transferência Asaas');

          // Sucesso
          item.status = 'paid';
          item.asaasTransferId = data.id;
          paidCount++;

          // Lançar despesa no caixa do CRM para cada pagamento
          const transactionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
          const newTransaction = {
            id: transactionId,
            description: `Pagamento Salário - ${item.userName} (Competência: ${competence})`,
            amount: Number(item.netAmount.toFixed(2)),
            date: Date.now(),
            type: 'EXPENSE',
            status: 'PAID',
            categoryId: 'payroll',
            categoryName: 'Folha de Pagamento'
          };
          await setDoc(doc(db, 'organizations', effectiveOrgId, 'transactions', transactionId), newTransaction);

          // Atualizar o status do adiantamento do mês para pago se compensado
          const myAdvances = advances.filter(a => a.userId === item.userId);
          for (const adv of myAdvances) {
            if (adv.id) {
              await updateDoc(doc(db, 'organizations', effectiveOrgId, 'salary_advances', adv.id), {
                status: 'repaid',
                repaidAt: Date.now(),
                payrollPeriodId: payrollId
              });
            }
          }

          // Liquidar comissões pendentes incluídas
          const myCommissions = commissions.filter(c => c.userId === item.userId || c.agentId === item.userId);
          for (const comm of myCommissions) {
            if (comm.id) {
              await updateDoc(doc(db, 'organizations', effectiveOrgId, 'commissions', comm.id), {
                status: 'PAID',
                paidAt: Date.now()
              });
            }
          }

        } catch (itemErr: any) {
          console.error(`Erro ao pagar ${item.userName}:`, itemErr);
          item.status = 'failed';
          item.errorMessage = itemErr.message || 'Falha Asaas';
          failCount++;
        }

        payrollDoc.items.push(item);
      }

      payrollDoc.totalPaid = payrollItems
        .filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + i.netAmount, 0);
      payrollDoc.status = failCount === 0 ? 'paid' : 'draft';

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'payrolls', payrollId), payrollDoc);

      toast.success(`Fechamento da folha concluído! Sucessos: ${paidCount} | Falhas: ${failCount}`);
      calculatePayroll(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro geral ao processar folha de pagamento.');
    } finally {
      setProcessingInBatch(false);
    }
  };

  // 7. Simular Adiantamento de Férias CLT
  const handleOpenVacationCalc = (userId: string) => {
    const prof = profiles.find(p => p.uid === userId);
    if (!prof) return;
    
    const now = Date.now();
    const range12m = now - (365 * 24 * 60 * 60 * 1000);
    const absencesInAquisitive = vacations.filter(v => 
      v.userId === userId && 
      v.reason === 'Falta' && 
      v.createdAt >= range12m &&
      (v.status === 'Aprovado' || v.status === 'Informado')
    ).length;

    let daysAllowed = 30;
    if (absencesInAquisitive > 5 && absencesInAquisitive <= 14) daysAllowed = 24;
    else if (absencesInAquisitive > 14 && absencesInAquisitive <= 23) daysAllowed = 18;
    else if (absencesInAquisitive > 23 && absencesInAquisitive <= 32) daysAllowed = 12;
    else if (absencesInAquisitive > 32) daysAllowed = 0;

    const baseSalary = Number(prof.salary) || 0;
    const gross = (baseSalary / 30) * 30; // base de 30 dias
    const oneThird = gross / 3;
    const net = gross + oneThird;

    setVacationCalc({
      userId,
      vacationId: '',
      days: Math.min(30, daysAllowed),
      grossAmount: gross,
      oneThird,
      net,
      absencesInPeriod: absencesInAquisitive,
      daysAllowed
    });
    setShowVacationModal(true);
  };

  const handleConfirmVacationPayment = async () => {
    if (!effectiveOrgId || !vacationCalc.userId) return;
    
    const prof = profiles.find(p => p.uid === vacationCalc.userId);
    if (!prof) return;

    const confirmV = await confirm({
      title: 'Confirmar Adiantamento de Férias',
      message: `Confirmar o adiantamento de Férias de ${prof.displayName} no valor líquido de R$ ${vacationCalc.net.toFixed(2)}? O Pix será agendado para 2 dias antes das férias no Asaas.`,
      confirmText: 'Sim, Confirmar',
      cancelText: 'Cancelar'
    });
    if (!confirmV) return;

    try {
      const token = await user?.getIdToken();
      const payload = {
        value: Number(vacationCalc.net.toFixed(2)),
        description: `Adiantamento de Férias CLT - ${prof.displayName}`,
        targetUserId: vacationCalc.userId,
        type: 'vacation'
      };

      const res = await fetch('/api/asaas_handler?action=transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na transferência de Férias Asaas');

      const paymentRef = doc(collection(db, 'organizations', effectiveOrgId, 'vacation_payments'));
      await setDoc(paymentRef, {
        id: paymentRef.id,
        userId: vacationCalc.userId,
        userName: prof.displayName || 'Colaborador',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        daysCount: vacationCalc.days,
        grossAmount: vacationCalc.grossAmount,
        oneThirdAmount: vacationCalc.oneThird,
        taxDeductions: 0,
        netAmount: vacationCalc.net,
        paymentDate: Date.now(),
        status: 'paid',
        asaasTransferId: data.id
      });

      const transactionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      await setDoc(doc(db, 'organizations', effectiveOrgId, 'transactions', transactionId), {
        id: transactionId,
        description: `Férias CLT Antecipadas - ${prof.displayName}`,
        amount: Number(vacationCalc.net.toFixed(2)),
        date: Date.now(),
        type: 'EXPENSE',
        status: 'PAID',
        categoryId: 'payroll',
        categoryName: 'Folha de Pagamento'
      });

      toast.success('Adiantamento de Férias CLT processado e agendado com sucesso!');
      setShowVacationModal(false);
      calculatePayroll(true);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar adiantamento de férias');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Resumo da Folha e Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black/40 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div className="text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-white">Competência</span>
            <input 
              type="month"
              value={competence}
              onChange={e => setCompetence(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-sm font-bold text-white outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <p className="text-xs text-gray-400">
            Período de Apuração: <span className="text-white font-semibold">{startDate ? startDate.toLocaleDateString('pt-BR') : ''}</span> até <span className="text-white font-semibold">{endDate ? endDate.toLocaleDateString('pt-BR') : ''}</span> | Pagamento: <span className="text-white font-semibold">{paymentDate ? paymentDate.toLocaleDateString('pt-BR') : ''}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Configurações de Vencimento"
          >
            <Settings size={18} />
          </button>
          
          <button
            onClick={() => calculatePayroll(false)}
            disabled={calculating}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all text-xs flex items-center gap-2"
          >
            <RefreshCw size={14} className={calculating ? 'animate-spin' : ''} />
            Recalcular
          </button>

          <button
            onClick={handleProcessPayroll}
            disabled={processingInBatch || selectedItems.length === 0}
            className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/20 text-gray-900 disabled:text-gray-500 rounded-2xl font-black uppercase tracking-wider text-xs transition-all flex items-center gap-2 shadow-lg shadow-primary-500/10"
          >
            {processingInBatch ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Processando...
              </>
            ) : (
              `Pagar Folha (${selectedItems.length})`
            )}
          </button>
        </div>
      </div>

      {/* Grid de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Total Líquido Calculado</p>
          <p className="text-2xl font-black text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              payrollItems.reduce((acc, i) => acc + i.netAmount, 0)
            )}
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Colaboradores CLT</p>
          <p className="text-2xl font-black text-white">
            {payrollItems.filter(i => i.contractType === 'CLT').length}
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Prestadores PJ</p>
          <p className="text-2xl font-black text-white">
            {payrollItems.filter(i => i.contractType === 'PJ').length}
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl border-amber-500/10 bg-amber-500/5">
          <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold">Sem Chave Pix</p>
          <p className="text-2xl font-black text-amber-400">
            {payrollItems.filter(i => !i.pixKey).length}
          </p>
        </div>
      </div>

      {/* Tabela de Fechamento */}
      <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === payrollItems.length && payrollItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(payrollItems.map(i => i.userId));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    className="rounded border-white/10 bg-black/40 text-primary-500 focus:ring-0 focus:ring-offset-0"
                  />
                </th>
                <th className="p-4">Colaborador</th>
                <th className="p-4">Contrato</th>
                <th className="p-4 text-right">Salário Base</th>
                <th className="p-4 text-right">Adicionais</th>
                <th className="p-4 text-right">Descontos</th>
                <th className="p-4 text-right">Líquido</th>
                <th className="p-4 text-center">Pix/Banco</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Calculando provisões e compilando registros do mês...</p>
                  </td>
                </tr>
              ) : payrollItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-500 text-sm">
                    Nenhum colaborador com salário base configurado localizado na organização.
                  </td>
                </tr>
              ) : (
                payrollItems.map(item => {
                  const isExpanded = expandedItem === item.userId;
                  const totalAdicionais = item.overtimeAmount + item.commissionsAmount + item.benefitsInCash + item.otherIncomes;
                  const totalDescontos = item.absencesDeducted + item.advancesDeducted + item.benefitDeductions + item.taxDeductions + item.vacationDeductionAmount + item.otherExpenses;

                  return (
                    <React.Fragment key={item.userId}>
                      <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${item.isResignation ? 'bg-rose-500/5' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.userId)}
                            disabled={item.status === 'paid'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.userId]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.userId));
                              }
                            }}
                            className="rounded border-white/10 bg-black/40 text-primary-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-30"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white">
                              {item.userName[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                                {item.userName}
                                {item.isResignation && (
                                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded-md text-[8px] font-black uppercase">Rescisão</span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500">{item.contractType}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-400">{item.contractType}</td>
                        <td className="p-4 text-sm font-bold text-white text-right">R$ {item.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-sm font-bold text-emerald-400 text-right">+R$ {totalAdicionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-sm font-bold text-rose-400 text-right">-R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-sm font-black text-white text-right">R$ {item.netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="p-4 text-center">
                          {item.pixKey ? (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-bold" title={item.pixKey}>Pix ativo</span>
                          ) : item.bankAccount?.bankCode ? (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] font-bold">TED ativo</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md text-[9px] font-bold">Sem dados</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {item.status === 'paid' ? (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase">Pago</span>
                          ) : item.status === 'failed' ? (
                            <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-[9px] font-black uppercase" title={item.errorMessage}>Falhou</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-lg text-[9px] font-black uppercase">Pendente</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {item.contractType === 'CLT' && (
                              <button
                                onClick={() => handleOpenVacationCalc(item.userId)}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/10"
                              >
                                Férias
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedItem(isExpanded ? null : item.userId)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha Expandida com Detalhes */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-4 bg-white/[0.02] border-b border-white/5">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left p-2"
                              >
                                <div className="space-y-3">
                                  <p className="font-bold text-gray-400 border-b border-white/5 pb-1">Demonstrativo de Proventos</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <span className="text-gray-500">Salário Regular:</span>
                                    <span className="font-semibold text-white text-right">R$ {item.baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    
                                    <span className="text-gray-500">Horas Extras ({item.overtimeHours.toFixed(1)}h):</span>
                                    <span className="font-semibold text-emerald-400 text-right">+R$ {item.overtimeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    
                                    <span className="text-gray-500">Comissões Acumuladas:</span>
                                    <span className="font-semibold text-emerald-400 text-right">+R$ {item.commissionsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                    <span className="text-gray-500">Benefícios / Auxílio Dinheiro:</span>
                                    <span className="font-semibold text-emerald-400 text-right">+R$ {item.benefitsInCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                  
                                  {item.isResignation && (
                                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 space-y-1">
                                      <p className="font-bold text-rose-500">Diretos Rescisórios:</p>
                                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                                        <span className="text-gray-400">Saldo de Salário:</span>
                                        <span className="text-white text-right">R$ {item.resignationProventos.salaryBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        
                                        <span className="text-gray-400">13º Proporcional:</span>
                                        <span className="text-white text-right">R$ {item.resignationProventos.thirteenthSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                        <span className="text-gray-400">Férias Proporcionais + 1/3:</span>
                                        <span className="text-white text-right">R$ {item.resignationProventos.vacationsProportional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                        <span className="text-gray-400">Aviso Prévio Indenizado:</span>
                                        <span className="text-white text-right">R$ {item.resignationProventos.noticeIndemnified.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                        {item.contractType === 'PJ' && item.resignationProventos.pjPenalty > 0 && (
                                          <>
                                            <span className="text-gray-400">Multa Rescisória Contrato:</span>
                                            <span className="text-white text-right">R$ {item.resignationProventos.pjPenalty.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  <p className="font-bold text-gray-400 border-b border-white/5 pb-1">Demonstrativo de Descontos</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <span className="text-gray-500">Ausências / Faltas ({item.absencesCount} dias):</span>
                                    <span className="font-semibold text-rose-400 text-right">-R$ {item.absencesDeducted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                    <span className="text-gray-500">Adiantamentos Salariais do Mês:</span>
                                    <span className="font-semibold text-rose-400 text-right">-R$ {item.advancesDeducted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                    <span className="text-gray-500">Copart. & Descontos Benefícios:</span>
                                    <span className="font-semibold text-rose-400 text-right">-R$ {item.benefitDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>

                                    {item.contractType === 'CLT' && (
                                      <>
                                        <span className="text-gray-500">Impostos Provisórios (INSS/IRRF):</span>
                                        <span className="font-semibold text-rose-400 text-right">-R$ {item.taxDeductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        
                                        <span className="text-gray-500">Férias Gozadas no Mês ({item.vacationDaysDeducted} dias):</span>
                                        <span className="font-semibold text-rose-400 text-right" title="Valor já pago de forma antecipada">-R$ {item.vacationDeductionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adiantamento de Férias CLT */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 max-w-md w-full text-left space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              Adiantamento de Férias CLT
            </h3>
            
            <div className="bg-white/5 rounded-2xl p-4 space-y-3 text-xs">
              <p className="text-gray-400">
                Faltas acumuladas no período aquisitivo: <span className="text-white font-bold">{vacationCalc.absencesInPeriod} faltas não justificadas</span>
              </p>
              <p className="text-gray-400">
                Limite máximo de dias de férias permitido por lei: <span className="text-amber-400 font-bold">{vacationCalc.daysAllowed} dias</span>
              </p>
              <div className="border-t border-white/5 pt-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor Bruto Férias ({vacationCalc.days} dias):</span>
                  <span className="text-white font-semibold">R$ {vacationCalc.grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">1/3 Constitucional:</span>
                  <span className="text-white font-semibold">R$ {vacationCalc.oneThird.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-gray-300">Líquido a Receber:</span>
                  <span className="font-black text-amber-400">R$ {vacationCalc.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 italic">
              * O pagamento das férias deve ocorrer até 2 dias antes do início do gozo (Art. 145 CLT). No retorno, os dias de férias gozados serão descontados proporcionalmente no salário do mês correspondente.
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowVacationModal(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmVacationPayment}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
              >
                Confirmar & Agendar Pix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações da Folha */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-left space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Settings size={20} className="text-primary-500" />
              Configurações de Apuração da Folha
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Dia de Início da Apuração (Competência)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={tempSettings.accrualStartDay}
                  onChange={e => setTempSettings({ ...tempSettings, accrualStartDay: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-[9px] text-gray-500 mt-1 block">Ex: Dia 21 (folha roda de 21 do mês anterior até 20 do mês corrente)</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Dia Padrão do Vencimento / Pagamento</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={tempSettings.paymentDay}
                  onChange={e => setTempSettings({ ...tempSettings, paymentDay: parseInt(e.target.value) || 5 })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-[9px] text-gray-500 mt-1 block">Ex: Dia 5 (salários pagos no dia 5 do mês seguinte à competência)</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-gray-900 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
