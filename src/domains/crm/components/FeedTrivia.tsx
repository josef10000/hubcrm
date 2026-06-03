import React, { useState, useEffect } from 'react';
import { HelpCircle, Award, Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@auth/contexts/AuthContext';
import { useArenaStore } from '@store/useArenaStore';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface TriviaQuestion {
  category: string;
  question: string;
  correctAnswer: string;
  answers: string[];
}

function decodeHtml(html: string): string {
  try {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  } catch (e) {
    return html;
  }
}

export default function FeedTrivia() {
  const { userProfile } = useAuth();
  const addArenaCredits = useArenaStore(state => state.addArenaCredits);

  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-'); // YYYY-MM-DD
  const hasCompletedToday = userProfile?.lastTriviaCompletedDate === todayStr;

  useEffect(() => {
    // Só carregar a pergunta se o usuário ainda não respondeu hoje
    if (hasCompletedToday || !userProfile) return;

    setLoading(true);
    fetch('https://opentdb.com/api.php?amount=1&type=multiple')
      .then(res => {
        if (!res.ok) throw new Error('Falha na resposta da API');
        return res.json();
      })
      .then(data => {
        const raw = data.results?.[0];
        if (!raw) throw new Error('Nenhuma pergunta encontrada');

        const correct = decodeHtml(raw.correct_answer);
        const incorrects = (raw.incorrect_answers || []).map((ans: string) => decodeHtml(ans));
        
        // Misturar respostas de forma aleatória
        const answers = [correct, ...incorrects].sort(() => Math.random() - 0.5);

        setQuestion({
          category: decodeHtml(raw.category),
          question: decodeHtml(raw.question),
          correctAnswer: correct,
          answers
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('[FeedTrivia] Erro ao carregar Trivia:', err);
        setLoading(false);
      });
  }, [hasCompletedToday, userProfile]);

  const handleAnswerSubmit = async () => {
    if (!selectedAnswer || !question || !userProfile) return;

    setSubmitting(true);
    const correct = selectedAnswer === question.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    try {
      // 1. Gravar no Firestore que ele já participou hoje
      const profileRef = doc(db, 'profiles', userProfile.uid);
      await updateDoc(profileRef, {
        lastTriviaCompletedDate: todayStr
      });

      // 2. Conceder 50 Hub Coins se acertar
      if (correct) {
        await addArenaCredits(userProfile.uid, 50);
        
        // Confete!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#fbbf24', '#f43f5e', '#3b82f6', '#10b981']
        });
        
        toast.success('🏆 Resposta Correta! +50 Hub Coins creditadas na sua conta!');
      } else {
        toast.error('❌ Que pena! Resposta incorreta.');
      }
    } catch (e) {
      console.error('[FeedTrivia] Erro ao salvar progresso do quiz:', e);
      toast.error('Erro ao processar sua recompensa. O progresso diário foi salvo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-6 text-left h-full min-h-[380px] flex flex-col relative overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <HelpCircle size={18} className="text-purple-500" />
          Desafio da Trivia
        </h3>
        <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-[9px] font-black text-purple-400 rounded-lg uppercase tracking-wider flex items-center gap-1">
          <Award size={10} />
          50 Coins
        </span>
      </div>

      {/* Condições de Visualização */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <Loader2 className="animate-spin text-purple-500 mb-2" size={24} />
          <span className="text-xs text-gray-500 font-medium">Buscando pergunta do dia...</span>
        </div>
      ) : hasCompletedToday ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center text-purple-400 text-3xl shadow-[0_0_20px_rgba(168,85,247,0.1)]">
            🌟
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Desafio Concluído!</h4>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-xs">
              Você já participou da trivia diária de hoje. Volte amanhã para novos desafios e mais Hub Coins! 🪙
            </p>
          </div>
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold text-gray-400">
            Saldo Atual: <span className="text-amber-400">{userProfile.arenaCredits || 0} Coins</span>
          </div>
        </div>
      ) : question ? (
        <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in duration-300 min-h-0">
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {/* Categoria */}
            <span className="inline-block text-[9px] font-black uppercase text-purple-400 bg-purple-500/5 border border-purple-500/10 px-2 py-0.5 rounded-md">
              {question.category}
            </span>
            
            {/* Pergunta */}
            <h4 className="text-xs font-bold text-white leading-relaxed">
              {question.question}
            </h4>

            {/* Alternativas */}
            <div className="space-y-2 pt-2">
              {question.answers.map((answer) => {
                const isSelected = selectedAnswer === answer;
                const isCorrectAns = answer === question.correctAnswer;
                
                let buttonStyle = "bg-white/[0.01] border-white/5 text-gray-300 hover:bg-white/[0.03] hover:border-white/10";
                if (showResult) {
                  if (isCorrectAns) {
                    buttonStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]";
                  } else if (isSelected) {
                    buttonStyle = "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.05)]";
                  } else {
                    buttonStyle = "bg-white/[0.01] border-white/5 text-gray-500 opacity-50";
                  }
                } else if (isSelected) {
                  buttonStyle = "bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.05)]";
                }

                return (
                  <button
                    key={answer}
                    disabled={showResult}
                    onClick={() => setSelectedAnswer(answer)}
                    className={`w-full flex items-center justify-between p-3 border rounded-2xl text-xs font-semibold text-left transition-all duration-300 cursor-pointer ${buttonStyle}`}
                  >
                    <span className="truncate pr-2">{answer}</span>
                    {showResult && isCorrectAns && <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />}
                    {showResult && isSelected && !isCorrectAns && <XCircle size={14} className="text-red-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botão de Ação */}
          {!showResult ? (
            <button
              disabled={!selectedAnswer || submitting}
              onClick={handleAnswerSubmit}
              className="w-full py-3 bg-purple-500 hover:bg-purple-400 disabled:opacity-40 disabled:hover:bg-purple-500 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submeter Resposta
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-bold text-gray-400 animate-in fade-in duration-300">
              {isCorrect ? (
                <>
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Muito bem! Você acumulou +50 Hub Coins!</span>
                </>
              ) : (
                <span>Incorreto. A resposta certa está destacada em verde.</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center py-12">
          <p className="text-xs text-gray-500">Erro ao carregar desafio diário. Tente novamente mais tarde.</p>
        </div>
      )}
    </div>
  );
}
