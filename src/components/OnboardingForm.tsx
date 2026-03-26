import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle, Globe, Building2, Mail, Phone, User as UserIcon, FileText, Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { getPlanPrice, getSetupPrice } from '../App';

export default function OnboardingForm() {
  const { userId, clientId } = useParams<{ userId: string, clientId?: string }>();
  const [searchParams] = useSearchParams();
  const referralId = searchParams.get('ref');
  const [loading, setLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [basicData, setBasicData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpfCnpj: '',
    plan: 'Essencial',
    billingCycle: 'MONTHLY',
    customSetupPrice: undefined as number | undefined,
    customMonthlyPrice: undefined as number | undefined
  });
  
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    // Force dark mode for onboarding form
    document.documentElement.classList.add('dark');
    
    const fetchData = async () => {
      if (!userId) return;
      try {
        const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists() && docSnap.data().onboardingQuestions) {
          setQuestions(docSnap.data().onboardingQuestions);
        } else {
          // Default questions if none set
          setQuestions([
            { id: '1', text: 'Qual o nome da sua empresa?', type: 'text', required: true },
            { id: '2', text: 'Descreva brevemente o seu negócio', type: 'textarea', required: true },
            { id: '3', text: 'Quais são as suas cores preferidas?', type: 'text', required: false },
            { id: '4', text: 'Logo da Empresa (Opcional)', type: 'file', required: false }
          ]);
        }

        if (clientId) {
          const clientRef = doc(db, 'users', userId, 'clients', clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const data = clientSnap.data();
            setBasicData({
              name: data.name || '',
              email: data.email || '',
              whatsapp: data.whatsapp || '',
              cpfCnpj: data.cpfCnpj || '',
              plan: data.plan || 'Essencial',
              billingCycle: data.billingCycle || 'MONTHLY',
              customSetupPrice: data.customSetupPrice,
              customMonthlyPrice: data.customMonthlyPrice
            });
            if (data.onboardingAnswers) {
              setAnswers(data.onboardingAnswers);
            }
          } else {
            setClientNotFound(true);
          }
        }
      } catch (error) {
        console.error("Error fetching onboarding settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    // Validate required dynamic questions
    for (const q of questions) {
      if (q.required && !answers[q.id]) {
        toast.error(`A pergunta "${q.text}" é obrigatória.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (clientId) {
        const clientRef = doc(db, 'users', userId, 'clients', clientId);
        await updateDoc(clientRef, {
          name: basicData.name,
          email: basicData.email,
          whatsapp: basicData.whatsapp,
          cpfCnpj: basicData.cpfCnpj,
          onboardingAnswers: answers,
          referredBy: referralId || null
        });
        setSuccess(true);
      } else if (referralId) {
        // Create new client from referral
        const newClientRef = doc(collection(db, 'users', userId, 'clients'));
        const newClientId = newClientRef.id;
        
        await setDoc(newClientRef, {
          id: newClientId,
          name: basicData.name,
          email: basicData.email,
          whatsapp: basicData.whatsapp,
          cpfCnpj: basicData.cpfCnpj,
          plan: basicData.plan,
          status: 'Em Desenvolvimento',
          createdAt: Date.now(),
          onboardingAnswers: answers,
          referredBy: referralId
        });

        // Create referral record
        const referralRef = doc(collection(db, 'users', userId, 'referrals'));
        await setDoc(referralRef, {
          id: referralRef.id,
          referrerId: referralId,
          referredClientId: newClientId,
          status: 'pending',
          createdAt: Date.now()
        });

        setSuccess(true);
      }
    } catch (error) {
      console.error("Error submitting onboarding:", error);
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!clientId && !referralId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Link Inválido</h2>
          <p className="text-gray-400 mb-8">
            Este formulário só pode ser acessado através de um link específico enviado pelo seu consultor ou através de uma indicação.
          </p>
        </div>
      </div>
    );
  }

  if (clientId && clientNotFound) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Cliente não encontrado</h2>
          <p className="text-gray-400 mb-8">
            O link acessado não é válido ou o cliente não foi encontrado em nossa base de dados.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Tudo certo!</h2>
          <p className="text-gray-400 mb-8">
            ReceBemos suas informações com sucesso. Em breve entraremos em contato para dar andamento ao seu projeto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-100 relative overflow-hidden">
      <Toaster theme="dark" position="top-right" />
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/20">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Bem-vindo(a)!</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Para começarmos o seu projeto da melhor forma, precisamos de algumas informações. Por favor, preencha o formulário abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info Section */}
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary-500" />
              Seus Dados
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome Completo / Empresa *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={basicData.name}
                    onChange={(e) => setBasicData({...basicData, name: e.target.value})}
                    className="block w-full pl-10 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="Sua Empresa Ltda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">E-mail *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={basicData.email}
                    onChange={(e) => setBasicData({...basicData, email: e.target.value})}
                    className="block w-full pl-10 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="contato@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={basicData.whatsapp}
                    onChange={(e) => setBasicData({...basicData, whatsapp: e.target.value})}
                    className="block w-full pl-10 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">CPF / CNPJ</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    value={basicData.cpfCnpj}
                    onChange={(e) => setBasicData({...basicData, cpfCnpj: e.target.value})}
                    className="block w-full pl-10 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              {!clientId && referralId && (
                <div className="md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <label className="block text-sm font-medium text-gray-300">Plano Desejado *</label>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setBasicData(prev => ({ ...prev, billingCycle: 'MONTHLY' }))}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${basicData.billingCycle === 'MONTHLY' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBasicData(prev => ({ ...prev, billingCycle: 'YEARLY' }))}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${basicData.billingCycle === 'YEARLY' ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                      >
                        Anual
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setBasicData({...basicData, plan: 'Essencial'})}
                      className={`p-4 rounded-2xl border transition-all text-left flex flex-col h-full ${basicData.plan === 'Essencial' ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}
                    >
                      <p className="font-bold text-lg">Ecossistema Essencial</p>
                      <p className="text-xs opacity-70 mb-4">Ideal para negócios locais e prestadores de serviço que precisam de posicionamento profissional rápido.</p>
                      
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2 mb-4 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Setup</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getSetupPrice('Essencial').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mensal</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getPlanPrice('Essencial', 'MONTHLY').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Anual</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getPlanPrice('Essencial', 'YEARLY').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Combo Anual</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-400">R$ {getPlanPrice('Essencial', 'YEARLY').toLocaleString('pt-BR')}</span>
                              <p className="text-[9px] text-emerald-500/70 font-medium">Desconto de 3 meses</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-2 flex-1 w-full">
                        {[
                          'Design focado em conversão',
                          'Otimização para mobile',
                          'Hospedagem e segurança inclusas',
                          'Suporte técnico mensal'
                        ].map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5 shrink-0">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-4 pt-4 border-t border-white/10 w-full">
                        <div className="text-sm font-bold mt-1 text-primary-400">R$ {getPlanPrice('Essencial', basicData.billingCycle).toLocaleString('pt-BR')}/{basicData.billingCycle === 'YEARLY' ? 'ano' : 'mês'}</div>
                        {basicData.billingCycle === 'YEARLY' && (
                          <div className="text-[10px] text-emerald-400 mt-1 font-medium">
                            Desconto de 3 meses (Setup + 9 parcelas)<br/>
                            Em até 12x sem juros no cartão
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasicData({...basicData, plan: 'Profissional'})}
                      className={`p-4 rounded-2xl border transition-all text-left flex flex-col h-full relative ${basicData.plan === 'Profissional' ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary-600 to-primary-400 text-white text-[9px] font-black rounded-full uppercase tracking-[0.2em] shadow-lg shadow-primary-500/40 z-10">
                        Mais Popular
                      </div>
                      <p className="font-bold text-lg mt-2">Profissional</p>
                      <p className="text-xs opacity-70 mb-4">Indicado para empresas que querem transmitir mais autoridade, melhorar sua apresentação online e gerar contatos mais qualificados.</p>
                      
                      <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2 mb-4 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Setup</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getSetupPrice('Profissional').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mensal</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getPlanPrice('Profissional', 'MONTHLY').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="h-px bg-white/5 w-full"></div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Anual</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">R$ {getPlanPrice('Profissional', 'YEARLY').toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Combo Anual</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-400">R$ {getPlanPrice('Profissional', 'YEARLY').toLocaleString('pt-BR')}</span>
                              <p className="text-[9px] text-emerald-500/70 font-medium">Desconto de 3 meses</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ul className="space-y-2 flex-1 w-full">
                        <li className="flex items-start gap-2 text-[10px] text-primary-400 font-bold uppercase tracking-wider mb-2">
                          <div className="p-0.5 rounded-full bg-primary-500/20 shrink-0">
                            <CheckCircle className="w-3 h-3 text-primary-400" />
                          </div>
                          Tudo do Ecossistema Essencial, mais:
                        </li>
                        {[
                          'Site Multi-páginas Estruturado',
                          'Copywriting persuasivo (Agro)',
                          'Formulários de cotação',
                          'Domínio Oficial (.com.br)',
                          'Otimização de SEO Local',
                          'Atendimento prioritário'
                        ].map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                            <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5 shrink-0">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            {f}
                          </li>
                        ))}
                      </ul>

                        <div className="mt-4 pt-4 border-t border-white/10 w-full">
                          <div className="text-xs opacity-80">Setup: R$ {getSetupPrice('Profissional').toLocaleString('pt-BR')}</div>
                          <div className="text-sm font-bold mt-1 text-primary-400">
                            R$ {getPlanPrice('Profissional', basicData.billingCycle).toLocaleString('pt-BR')}/{basicData.billingCycle === 'YEARLY' ? 'ano' : 'mês'}
                          </div>
                          {basicData.billingCycle === 'YEARLY' && (
                            <div className="text-[10px] text-emerald-400 mt-1 font-medium">
                              12x de R$ {(getPlanPrice('Profissional', 'YEARLY') / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sem juros<br/>
                              Desconto de 3 meses (Setup + 9 parcelas)
                            </div>
                          )}
                        </div>
                    </button>

                    {/* Personalizado - Show if it's the current plan or if custom prices are set */}
                    {(basicData.plan === 'Personalizado' || basicData.customMonthlyPrice !== undefined || basicData.customSetupPrice !== undefined) && (
                      <button
                        type="button"
                        onClick={() => setBasicData({...basicData, plan: 'Personalizado'})}
                        className={`p-4 rounded-2xl border transition-all text-left flex flex-col h-full relative ${basicData.plan === 'Personalizado' ? 'bg-primary-500/20 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'}`}
                      >
                        <div className="absolute top-4 right-4">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${basicData.plan === 'Personalizado' ? 'border-primary-500 bg-primary-500' : 'border-white/20'}`}>
                            {basicData.plan === 'Personalizado' && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>

                        <p className="font-bold text-lg mt-2">Plano sob consulta</p>
                        <p className="text-xs opacity-70 mb-4">Plano com condições especiais negociadas diretamente com nossa equipe. Ideal para agências ou projetos complexos.</p>
                        
                        <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2 mb-4 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Setup</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">Sob Consulta</span>
                            </div>
                          </div>
                          <div className="h-px bg-white/5 w-full"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mensal</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">Sob Consulta</span>
                            </div>
                          </div>
                          <div className="h-px bg-white/5 w-full"></div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Anual</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-white">Sob Consulta</span>
                            </div>
                          </div>
                        </div>

                        <ul className="space-y-2 flex-1 w-full">
                          <li className="flex items-start gap-2 text-xs text-gray-300">
                            <div className="p-0.5 rounded-full bg-emerald-500/20 mt-0.5 shrink-0">
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            </div>
                            Recursos personalizados conforme contrato
                          </li>
                        </ul>

                        <div className="mt-4 pt-4 border-t border-white/10 w-full">
                          <div className="text-xs opacity-80">Setup: Sob Consulta</div>
                          <div className="text-sm font-bold mt-1 text-primary-400">
                            Sob Consulta
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Questions Section */}
          {questions.length > 0 && (
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Sobre o Projeto
              </h2>
              
              <div className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {q.text} {q.required && <span className="text-primary-500">*</span>}
                    </label>
                    
                    {q.type === 'text' && (
                      <input
                        type="text"
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="block w-full px-4 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                      />
                    )}

                    {q.type === 'textarea' && (
                      <textarea
                        required={q.required}
                        rows={4}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="block w-full px-4 bg-black/40 border border-white/10 rounded-xl py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none resize-none"
                      />
                    )}

                    {q.type === 'select' && (
                      <select
                        required={q.required}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                        className="block w-full px-4 bg-black/40 border border-white/10 rounded-xl py-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none appearance-none"
                      >
                        <option value="" disabled className="bg-[#030712] text-white">Selecione uma opção</option>
                        {q.options?.split(',').map((opt: string, i: number) => (
                          <option key={i} value={opt.trim()} className="bg-[#030712] text-white">{opt.trim()}</option>
                        ))}
                      </select>
                    )}

                    {q.type === 'file' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-xl cursor-pointer bg-black/40 hover:bg-black/50 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 text-gray-500 mb-2" />
                              <p className="text-sm text-gray-500">
                                <span className="font-semibold">Clique para enviar</span> ou arraste
                              </p>
                              <p className="text-xs text-gray-500 mt-1">PNG, JPG ou SVG (Máx. 2MB)</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    toast.error('O arquivo deve ter no máximo 2MB');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setAnswers({...answers, [q.id]: reader.result as string});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {answers[q.id] && (
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10">
                            <img src={answers[q.id]} alt="Preview" className="w-full h-full object-cover" />
                            <button 
                              type="button"
                              onClick={() => {
                                const newAnswers = {...answers};
                                delete newAnswers[q.id];
                                setAnswers(newAnswers);
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/50 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              {submitting ? 'Enviando...' : 'Enviar Briefing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
