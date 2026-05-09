import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OnboardingQuestion } from '../types';

export function useSettings(userId: string) {
  // ── Theme ──
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('theme-color') || 'orange');
  const [churnRiskDays, setChurnRiskDays] = useState(() => parseInt(localStorage.getItem('churnRiskDays') || '15', 10));

  // ── Settings ──
  const [defaultStages, setDefaultStages] = useState<{ id: string; name: string }[]>([
    { id: '1', name: 'Briefing' },
    { id: '2', name: 'Design UI' },
    { id: '3', name: 'Desenvolvimento' },
    { id: '4', name: 'Revisão' },
    { id: '5', name: 'Publicação' },
  ]);
  const [onboardingQuestions, setOnboardingQuestions] = useState<OnboardingQuestion[]>([
    { id: '1', text: 'Qual o nome da sua empresa?', type: 'text', required: true },
    { id: '2', text: 'Descreva brevemente o seu negócio', type: 'textarea', required: true },
    { id: '3', text: 'Quais são as suas cores preferidas?', type: 'text', required: false },
    { id: '4', text: 'Logo da Empresa (Opcional)', type: 'file', required: false },
  ]);
  const [defaultContractText, setDefaultContractText] = useState<string>('CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n1. OBJETO DO CONTRATO\nO presente instrumento tem como objeto a prestação de serviços digitais acordados entre as partes no plano ou projeto selecionado.\n\n2. PRAZOS E ENTREGAS\nAs entregas serão realizadas conforme cronograma acordado.\n\n3. PAGAMENTOS E CANCELAMENTOS\nEm caso de suspensão de pagamento, o serviço será suspenso após X dias. Cancelamentos devem ser notificados antecipadamente.');

  const [checkoutTitle, setCheckoutTitle] = useState('Nossa Proposta Comercial');
  const [checkoutDescription, setCheckoutDescription] = useState('Preencha os dados abaixo para iniciar sua jornada conosco.');

  const [enpsQuestion, setEnpsQuestion] = useState('Em uma escala de 0 a 10, o quanto você recomendaria a Hub Symples como um ótimo lugar para trabalhar?');
  const [enpsFrequency, setEnpsFrequency] = useState<'mensal' | 'trimestral' | 'semestral'>('mensal');

  const [csatTitle, setCsatTitle] = useState('Como foi seu atendimento?');
  const [csatQuestion, setCsatQuestion] = useState('Sua opinião é fundamental para melhorarmos nossos serviços. Como você avalia a resolução deste chamado?');

  const [softSkillsPool, setSoftSkillsPool] = useState<string[]>(['Comunicação', 'Liderança', 'Trabalho em Equipe', 'Resolução de Problemas', 'Inteligência Emocional']);
  const [beginnerGuideArticleId, setBeginnerGuideArticleId] = useState('');

  // ── Marketing ──
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{ title: string; message: string; type: string; isActive: boolean }>({
    title: '', message: '', type: 'info', isActive: false,
  });

  // ── Effects ──

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Theme color
  useEffect(() => {
    localStorage.setItem('theme-color', themeColor);
    document.documentElement.classList.remove('theme-orange', 'theme-blue', 'theme-green', 'theme-purple', 'theme-rose');
    document.documentElement.classList.add(`theme-${themeColor}`);
  }, [themeColor]);

  // Churn risk days
  useEffect(() => {
    localStorage.setItem('churnRiskDays', churnRiskDays.toString());
  }, [churnRiskDays]);

  // Settings listener
  useEffect(() => {
    if (!userId) return;
    const settingsRef = doc(db, 'organizations', userId, 'settings', 'preferences');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.defaultStages) setDefaultStages(data.defaultStages);
        if (data.onboardingQuestions) setOnboardingQuestions(data.onboardingQuestions);
        if (data.defaultContractText !== undefined) setDefaultContractText(data.defaultContractText);
        if (data.checkoutTitle) setCheckoutTitle(data.checkoutTitle);
        if (data.checkoutDescription) setCheckoutDescription(data.checkoutDescription);
        if (data.enpsQuestion) setEnpsQuestion(data.enpsQuestion);
        if (data.enpsFrequency) setEnpsFrequency(data.enpsFrequency);
        if (data.csatTitle) setCsatTitle(data.csatTitle);
        if (data.csatQuestion) setCsatQuestion(data.csatQuestion);
        if (data.softSkillsPool) setSoftSkillsPool(data.softSkillsPool);
        if (data.beginnerGuideArticleId) setBeginnerGuideArticleId(data.beginnerGuideArticleId);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // Global announcement listener
  useEffect(() => {
    if (!userId) return;
    const orgRef = doc(db, 'organizations', userId);
    const unsubGlobal = onSnapshot(orgRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.announcement) setGlobalAnnouncement(data.announcement);
      }
    });
    return () => unsubGlobal();
  }, [userId]);

  return {
    themeColor, setThemeColor,
    churnRiskDays, setChurnRiskDays,
    defaultStages, setDefaultStages,
    onboardingQuestions, setOnboardingQuestions,
    defaultContractText, setDefaultContractText,
    globalAnnouncement, setGlobalAnnouncement,
    checkoutTitle, setCheckoutTitle,
    checkoutDescription, setCheckoutDescription,
    enpsQuestion, setEnpsQuestion,
    enpsFrequency, setEnpsFrequency,
    csatTitle, setCsatTitle,
    csatQuestion, setCsatQuestion,
    softSkillsPool, setSoftSkillsPool,
    beginnerGuideArticleId, setBeginnerGuideArticleId,
  };
}
