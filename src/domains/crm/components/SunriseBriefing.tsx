import React, { useState, useEffect, useRef } from 'react';
import { Coffee, Play, Volume2, VolumeX, X, ArrowRight, Sun } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { format, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SunriseBriefingProps {
  onClose: () => void;
  forcePlay?: boolean;
}

const MOTIVATIONAL_PHRASES = [
  "O sucesso não é o segredo do sucesso, mas a consequência da preparação e do trabalho árduo.",
  "Foque no progresso, não na perfeição. Pequenas vitórias diárias constroem grandes impérios.",
  "Grandes coisas nunca vêm de zonas de conforto. Desafie-se hoje e faça acontecer.",
  "A persistência é o caminho do êxito. Cada obstáculo superado nos deixa mais próximos da meta.",
  "A cooperação e o trabalho em equipe transformam esforços individuais em conquistas extraordinárias.",
  "Inovação é a habilidade de ver a mudança como uma oportunidade, não como uma ameaça.",
  "A sua atitude determina a sua altitude. Comece o dia com energia e foco total.",
  "A produtividade nunca é um acidente. É sempre o resultado de compromisso com a excelência.",
  "Nenhum de nós é tão inteligente quanto todos nós juntos. Vamos vencer em equipe hoje.",
  "A disciplina é a ponte entre as suas metas e as suas realizações mais importantes.",
  "Transforme as dificuldades de hoje em degraus para o seu crescimento profissional de amanhã.",
  "O único lugar onde o sucesso vem antes do trabalho é no dicionário. Mãos à obra!",
  "Acredite que você pode e você já estará no meio do caminho.",
  "Seja a mudança e a proatividade que você deseja ver na nossa operação e nos resultados.",
  "O trabalho focado de hoje é a fundação do sucesso de amanhã. Faça valer a pena.",
  "Excelência não é um ato isolado, é um hábito construído com consistência todos os dias.",
  "A criatividade é a inteligência se divertindo. Pense fora da caixa hoje.",
  "Comprometimento é fazer o que precisa ser feito com integridade, energia e paixão.",
  "A sua determinação hoje define a velocidade dos seus resultados de amanhã.",
  "Juntos, não há desafio que não possamos superar. Tenha um ótimo e produtivo dia!",
  "A cada manhã nós nascemos de novo. O que fazemos hoje é o que mais importa.",
  "Você não encontra caminhos para o sucesso. Você os cria com sua atitude e esforço.",
  "A clareza de propósito gera a força da ação. Saiba onde quer chegar hoje.",
  "Grandes resultados requerem grandes ambições e a coragem para dar o primeiro passo.",
  "O foco direcionado supera qualquer obstáculo. Mantenha os olhos na meta.",
  "Erros de ontem são lições valiosas para construir as conquistas de hoje.",
  "A energia que você coloca no mundo é a mesma que retorna para você. Seja positivo.",
  "A coragem não é a ausência do medo, mas o julgamento de que algo é mais importante.",
  "O talento vence jogos, mas o trabalho em equipe e a inteligência vencem campeonatos.",
  "Não espere por circunstâncias ideais. Pegue as atuais e melhore-as com o seu trabalho."
];

export default function SunriseBriefing({ onClose, forcePlay = false }: SunriseBriefingProps) {
  const { userProfile } = useAuth();
  const { appointments = [] } = useCRM();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('O seu briefing diário está pronto.');
  const [showWelcome, setShowWelcome] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Calcula deterministicamente a frase do dia com base no dia do ano
  const getPhraseOfTheDay = (): string => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return MOTIVATIONAL_PHRASES[dayOfYear % MOTIVATIONAL_PHRASES.length];
  };

  // Contagem de compromissos para hoje
  const getTodayAppointmentsCount = (): number => {
    if (!userProfile) return 0;
    const todayStart = startOfToday().getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    return appointments.filter(a => 
      (a.targetId === userProfile.uid || a.requesterId === userProfile.uid) && 
      a.status === 'approved' &&
      a.startTime >= todayStart &&
      a.startTime < todayEnd
    ).length;
  };

  useEffect(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const lastBriefing = localStorage.getItem('sunrise_briefing_last_date');
    
    // Se não for forçado e já foi ouvido hoje, fecha automaticamente
    if (!forcePlay && lastBriefing === todayStr) {
      onClose();
    }
  }, [forcePlay, onClose]);

  const handleStartBriefing = () => {
    setShowWelcome(false);
    setIsPlaying(true);
    
    // Salvar a data atual como lida
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem('sunrise_briefing_last_date', todayStr);

    const userName = userProfile?.displayName || 'colaborador';
    const dayOfWeek = format(new Date(), 'EEEE', { locale: ptBR });
    const formattedDate = format(new Date(), "dd 'de' MMMM", { locale: ptBR });
    const meetingsCount = getTodayAppointmentsCount();
    const phrase = getPhraseOfTheDay();

    // Construção do script falado
    const greetingText = `Bom dia, ${userName}!`;
    const dateText = `Hoje é ${dayOfWeek}, dia ${formattedDate}.`;
    const scheduleText = meetingsCount > 0 
      ? `Você tem ${meetingsCount} ${meetingsCount === 1 ? 'compromisso agendado' : 'compromissos agendados'} para hoje na sua agenda.`
      : 'Você não tem nenhum compromisso agendado para hoje na sua agenda.';
    const motivationText = `A nossa frase inspiradora para começar o dia é: "${phrase}"`;
    const farewellText = 'Desejamos a você um excelente dia de trabalho!';

    const fullScript = `${greetingText} ${dateText} ${scheduleText} ${motivationText} ${farewellText}`;

    // Subtítulos temporizados simulados para acompanhar a fala
    const subtitleTimeline = [
      { delay: 0, text: `Bom dia, ${userName}! ✨` },
      { delay: 2500, text: `Hoje é ${dayOfWeek}, dia ${formattedDate}. 📅` },
      { delay: 6500, text: scheduleText + ' ⏳' },
      { delay: 11500, text: `Frase do dia: "${phrase}" 💡` },
      { delay: 20500, text: 'Desejamos a você um excelente dia de trabalho! ☕💼' }
    ];

    // Configurar o sintetizador de voz
    window.speechSynthesis.cancel(); // Parar qualquer fala anterior
    const utterance = new SpeechSynthesisUtterance(fullScript);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Tentar obter uma voz em português
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt-BR') || v.lang.startsWith('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onend = () => {
      setIsPlaying(false);
      // Fechamento automático após a fala com pequeno delay
      setTimeout(() => {
        onClose();
      }, 1500);
    };

    utterance.onerror = (e) => {
      console.error('[SunriseBriefing] Erro na síntese:', e);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);

    // Controlar a exibição dos subtítulos baseado nos tempos médios
    subtitleTimeline.forEach(item => {
      setTimeout(() => {
        if (window.speechSynthesis.speaking && utteranceRef.current === utterance) {
          setCurrentSubtitle(item.text);
        }
      }, item.delay);
    });
  };

  const handleToggleMute = () => {
    if (isMuted) {
      window.speechSynthesis.resume();
      setIsMuted(false);
    } else {
      window.speechSynthesis.pause();
      setIsMuted(true);
    }
  };

  const handleSkip = () => {
    window.speechSynthesis.cancel();
    onClose();
  };

  const userName = userProfile?.displayName || 'Colaborador';

  return (
    <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-2xl animate-in fade-in duration-300 select-none">
      
      {/* Botão de Fechar no canto superior */}
      <button 
        onClick={handleSkip}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
      >
        <span>Pular</span>
        <X size={14} />
      </button>

      {showWelcome ? (
        /* TELA DE BOAS-VINDAS INICIAL (AUTO-PLAY BYPASS) */
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="relative inline-flex items-center justify-center p-6 bg-gradient-to-br from-primary-500 to-purple-600 rounded-[2rem] border border-white/20 shadow-2xl shadow-primary-500/20 group hover:scale-105 transition-all duration-300">
            <Coffee size={48} className="text-white group-hover:rotate-6 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary-400 text-xs font-black uppercase tracking-widest">
              <Sun size={14} className="animate-spin-slow" />
              <span>Bom dia, {userName}</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">O seu Café & Briefing matinal está pronto!</h2>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              Sirva uma xícara, aumente o som e ouça a agenda, as reuniões e a frase inspiradora para decolar a sua produtividade hoje.
            </p>
          </div>

          <button
            onClick={handleStartBriefing}
            className="w-full flex items-center justify-center gap-3 py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-primary-500/20 active:scale-98"
          >
            <Play size={16} fill="white" />
            <span>Servir Café & Ouvir Briefing</span>
          </button>
        </div>
      ) : (
        /* TELA DE REPRODUÇÃO E ONDA SONORA ANIMADA */
        <div className="max-w-lg w-full text-center space-y-12 animate-in fade-in duration-500">
          
          {/* Animação Holográfica do Espectro de Áudio */}
          <div className="relative flex items-center justify-center py-8">
            
            {/* Círculo Holográfico Central */}
            <div className="relative w-40 h-40 bg-gradient-to-br from-primary-500/10 to-purple-500/5 rounded-full border-2 border-primary-500/20 flex items-center justify-center shadow-3xl shadow-primary-500/5 animate-pulse">
              <Coffee size={36} className="text-primary-400" />
              
              {/* Efeito Glow Pulsante Externo */}
              <div className="absolute inset-[-10px] bg-primary-500/5 rounded-full blur-md animate-ping duration-1000 opacity-60" />
            </div>

            {/* Onda Sonora de Barrinhas (CSS Puro) */}
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => {
                // Alturas e durações diferentes para um visual orgânico
                const heights = [20, 48, 72, 96, 120, 96, 72, 48, 20];
                const delays = [0.1, 0.3, 0.5, 0.7, 0.9, 0.7, 0.5, 0.3, 0.1];
                
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-primary-500 to-purple-600 transition-all opacity-80"
                    style={{
                      height: isPlaying && !isMuted ? 'auto' : '8px',
                      minHeight: '8px',
                      maxHeight: `${heights[i]}px`,
                      animation: isPlaying && !isMuted ? `soundWave 1.2s ease-in-out infinite` : 'none',
                      animationDelay: `${delays[i]}s`
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Subtítulos Dinâmicos com Efeito Neon */}
          <div className="space-y-4 min-h-[80px] flex items-center justify-center px-4">
            <p className="text-lg md:text-xl font-bold text-white transition-all duration-300 leading-relaxed text-center tracking-tight">
              {currentSubtitle}
            </p>
          </div>

          {/* Controles de Reprodução Premium */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleToggleMute}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95"
              title={isMuted ? "Retomar Áudio" : "Pausar Áudio"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <button
              onClick={handleSkip}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
            >
              <span>Entrar no CRM</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Estilos CSS Inline para a animação da onda sonora */}
      <style>{`
        @keyframes soundWave {
          0%, 100% { height: 8px; }
          50% { height: 110px; }
        }
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
