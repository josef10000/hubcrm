import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle, Globe, Building2, Mail, Phone, User as UserIcon, FileText, Upload, Image as ImageIcon, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function OnboardingForm() {
  const { userId, clientId } = useParams<{ userId: string, clientId?: string }>();
  const [loading, setLoading] = useState(true);
  const [clientNotFound, setClientNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [basicData, setBasicData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpfCnpj: ''
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
              cpfCnpj: data.cpfCnpj || ''
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
          onboardingAnswers: answers
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

  if (!clientId || clientNotFound) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-gray-100">
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Link Inválido</h2>
          <p className="text-gray-400 mb-8">
            {clientNotFound 
              ? "O link acessado não é válido ou o cliente não foi encontrado." 
              : "Este formulário só pode ser acessado através de um link específico enviado pelo seu consultor."}
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
                        <option value="" disabled>Selecione uma opção</option>
                        {q.options?.split(',').map((opt: string, i: number) => (
                          <option key={i} value={opt.trim()} className="bg-zinc-900">{opt.trim()}</option>
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
