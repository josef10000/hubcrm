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

const LOCAL_TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    category: "Geografia",
    question: "Qual é o maior país do mundo em extensão territorial?",
    correctAnswer: "Rússia",
    answers: ["Canadá", "Rússia", "China", "Estados Unidos"]
  },
  {
    category: "História",
    question: "Em que ano ocorreu a proclamação da República no Brasil?",
    correctAnswer: "1889",
    answers: ["1822", "1889", "1930", "1964"]
  },
  {
    category: "Ciências",
    question: "Qual é o elemento químico mais abundante no universo?",
    correctAnswer: "Hidrogênio",
    answers: ["Oxigênio", "Hidrogênio", "Hélio", "Carbono"]
  },
  {
    category: "Arte",
    question: "Quem pintou a obra 'Mona Lisa'?",
    correctAnswer: "Leonardo da Vinci",
    answers: ["Michelangelo", "Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso"]
  },
  {
    category: "Ciências",
    question: "Quantos planetas existem no Sistema Solar?",
    correctAnswer: "8",
    answers: ["7", "8", "9", "10"]
  },
  {
    category: "Filosofia",
    question: "De quem é a famosa frase filosófica 'Penso, logo existo'?",
    correctAnswer: "René Descartes",
    answers: ["Sócrates", "Platão", "René Descartes", "Friedrich Nietzsche"]
  },
  {
    category: "Esportes",
    question: "Qual país sediou os Jogos Olímpicos de Verão de 2016?",
    correctAnswer: "Brasil",
    answers: ["Estados Unidos", "Brasil", "Reino Unido", "Japão"]
  },
  {
    category: "Biologia",
    question: "Quantos ossos tem o corpo humano de um adulto em média?",
    correctAnswer: "206",
    answers: ["106", "206", "306", "406"]
  },
  {
    category: "Geografia",
    question: "Qual oceano banha a costa leste do Brasil?",
    correctAnswer: "Atlântico",
    answers: ["Pacífico", "Atlântico", "Índico", "Glacial Antártico"]
  },
  {
    category: "Geografia",
    question: "Qual é a capital do Canadá?",
    correctAnswer: "Ottawa",
    answers: ["Toronto", "Vancouver", "Montreal", "Ottawa"]
  },
  {
    category: "Literatura",
    question: "Quem escreveu o clássico romance brasileiro 'Dom Casmurro'?",
    correctAnswer: "Machado de Assis",
    answers: ["José de Alencar", "Machado de Assis", "Clarice Lispector", "Jorge Amado"]
  },
  {
    category: "Física",
    question: "Qual é a velocidade da luz aproximadamente no vácuo?",
    correctAnswer: "300.000 km/s",
    answers: ["150.000 km/s", "300.000 km/s", "1.000.000 km/s", "30.000 km/s"]
  },
  {
    category: "Química",
    question: "Qual metal é líquido em temperatura ambiente?",
    correctAnswer: "Mercúrio",
    answers: ["Ouro", "Ferro", "Mercúrio", "Prata"]
  },
  {
    category: "História",
    question: "Quantos anos durou a histórica 'Guerra dos Cem Anos'?",
    correctAnswer: "116 anos",
    answers: ["100 anos", "116 anos", "99 anos", "150 anos"]
  },
  {
    category: "Geografia",
    question: "Qual rio disputa com o Nilo o título de mais longo do mundo, sendo o maior em volume de água?",
    correctAnswer: "Rio Amazonas",
    answers: ["Rio Mississippi", "Rio Nilo", "Rio Amazonas", "Rio Yangtze"]
  },
  {
    category: "História",
    question: "Quem foi o primeiro homem a pisar na Lua, em 1969?",
    correctAnswer: "Neil Armstrong",
    answers: ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "Michael Collins"]
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Austrália?",
    correctAnswer: "Canberra",
    answers: ["Sydney", "Melbourne", "Brisbane", "Canberra"]
  },
  {
    category: "Esportes",
    question: "Em que ano foi realizada a primeira Copa do Mundo de Futebol?",
    correctAnswer: "1930",
    answers: ["1920", "1930", "1950", "1914"]
  },
  {
    category: "Física",
    question: "Qual cientista formulou a Teoria da Relatividade Geral?",
    correctAnswer: "Albert Einstein",
    answers: ["Isaac Newton", "Galileu Galilei", "Albert Einstein", "Nikola Tesla"]
  },
  {
    category: "Turismo",
    question: "Em qual cidade fica a famosa Torre Eiffel?",
    correctAnswer: "Paris",
    answers: ["Londres", "Paris", "Roma", "Berlim"]
  },
  {
    category: "História",
    question: "A qual civilização antiga é atribuída a invenção do papel?",
    correctAnswer: "Chinesa",
    answers: ["Egípcia", "Romana", "Chinesa", "Grega"]
  },
  {
    category: "Matemática",
    question: "Quantos lados tem um polígono heptágono?",
    correctAnswer: "7",
    answers: ["6", "7", "8", "9"]
  },
  {
    category: "Geografia",
    question: "Qual é o menor país do mundo em extensão territorial?",
    correctAnswer: "Vaticano",
    answers: ["Mônaco", "San Marino", "Vaticano", "Liechtenstein"]
  },
  {
    category: "Literatura",
    question: "Quem escreveu a célebre obra poética portuguesa 'Os Lusíadas'?",
    correctAnswer: "Luís de Camões",
    answers: ["Fernando Pessoa", "Luís de Camões", "Eça de Queirós", "José Saramago"]
  },
  {
    category: "Biologia",
    question: "Qual gás é o mais essencial para a respiração dos seres humanos?",
    correctAnswer: "Oxigênio",
    answers: ["Nitrogênio", "Gás Carbônico", "Oxigênio", "Hélio"]
  },
  {
    category: "Geografia",
    question: "Qual é a capital do estado de Goiás?",
    correctAnswer: "Goiânia",
    answers: ["Brasília", "Goiânia", "Anápolis", "Palmas"]
  },
  {
    category: "Esportes",
    question: "Quem é amplamente conhecido como o 'Rei do Futebol'?",
    correctAnswer: "Pelé",
    answers: ["Diego Maradona", "Pelé", "Lionel Messi", "Garrincha"]
  },
  {
    category: "Botânica",
    question: "Qual fruta é conhecida por apresentar as sementes do lado de fora da polpa?",
    correctAnswer: "Morango",
    answers: ["Morango", "Caju", "Figo", "Abacaxi"]
  },
  {
    category: "Demografia",
    question: "Qual país ultrapassou a China e se tornou o mais populoso do mundo recentemente?",
    correctAnswer: "Índia",
    answers: ["Estados Unidos", "Índia", "Indonésia", "Paquistão"]
  },
  {
    category: "Astronomia",
    question: "Qual é a estrela mais próxima da Terra depois do Sol?",
    correctAnswer: "Próxima Centauri",
    answers: ["Sirius", "Próxima Centauri", "Betelgeuse", "Alpha Centauri A"]
  },
  {
    category: "Ciências",
    question: "Quem foi a primeira mulher a ganhar um Prêmio Nobel na história?",
    correctAnswer: "Marie Curie",
    answers: ["Marie Curie", "Ada Lovelace", "Rosalind Franklin", "Irène Joliot-Curie"]
  },
  {
    category: "Anatomia",
    question: "Quantos dentes possui um ser humano adulto saudável e completo (incluindo os sisos)?",
    correctAnswer: "32",
    answers: ["28", "30", "32", "36"]
  },
  {
    category: "Literatura",
    question: "Qual é a obra literária de ficção mais vendida e traduzida da história?",
    correctAnswer: "Dom Quixote",
    answers: ["Dom Quixote", "O Pequeno Príncipe", "Um Conto de Duas Cidades", "O Senhor dos Anéis"]
  },
  {
    category: "Geografia",
    question: "Qual é a capital da Espanha?",
    correctAnswer: "Madri",
    answers: ["Barcelona", "Madri", "Sevilha", "Lisboa"]
  },
  {
    category: "Gastronomia",
    question: "Qual país é historicamente a pátria do risoto, da pizza e do macarrão?",
    correctAnswer: "Itália",
    answers: ["França", "Itália", "Grécia", "Espanha"]
  },
  {
    category: "Anatomia",
    question: "Qual órgão do corpo humano é responsável por bombear o sangue pelo sistema circulatório?",
    correctAnswer: "Coração",
    answers: ["Pulmão", "Cérebro", "Fígado", "Coração"]
  },
  {
    category: "Geografia",
    question: "Em qual continente está localizado o imenso Deserto do Saara?",
    correctAnswer: "África",
    answers: ["Ásia", "África", "Oceania", "América do Sul"]
  },
  {
    category: "Literatura",
    question: "Quem escreveu a famosa tragédia teatral 'Romeu e Julieta'?",
    correctAnswer: "William Shakespeare",
    answers: ["Miguel de Cervantes", "William Shakespeare", "Luis de Camões", "Dante Alighieri"]
  },
  {
    category: "Matemática",
    question: "Quantos segundos existem em uma hora completa?",
    correctAnswer: "3.600",
    answers: ["600", "3.600", "3.6000", "86.400"]
  },
  {
    category: "Ciências",
    question: "Qual cientista escocês descobriu a penicilina, o primeiro antibiótico, em 1928?",
    correctAnswer: "Alexander Fleming",
    answers: ["Louis Pasteur", "Alexander Fleming", "Robert Koch", "Edward Jenner"]
  }
];

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
    try {
      // Sorteio determinístico diário
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const questionIndex = dayOfYear % LOCAL_TRIVIA_QUESTIONS.length;
      const raw = LOCAL_TRIVIA_QUESTIONS[questionIndex];

      // Embaralhar as alternativas de forma determinística diária
      const answers = [...raw.answers].sort((a, b) => {
        const hashA = a.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayOfYear;
        const hashB = b.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + dayOfYear;
        return (hashA % 10) - (hashB % 10);
      });

      setQuestion({
        category: raw.category,
        question: raw.question,
        correctAnswer: raw.correctAnswer,
        answers
      });
    } catch (err) {
      console.error('[FeedTrivia] Erro ao carregar Trivia local:', err);
    } finally {
      setLoading(false);
    }
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
