import React, { useState, useEffect } from 'react';
import { CloudSun, Calendar, MessageCircle, FolderKanban, FileSpreadsheet, Palette, Loader2 } from 'lucide-react';

interface BentoWelcomeProps {
  userName: string;
}

interface WeatherInfo {
  temp: number;
  desc: string;
  city: string;
}

const FRASES_MOTIVACIONAIS = [
  { text: "O obstáculo é o caminho.", author: "Marco Aurélio" },
  { text: "A simplicidade é o último grau de sofisticação.", author: "Leonardo da Vinci" },
  { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Grandes conquistas são feitas de pequenos hábitos diários.", author: "Sêneca" },
  { text: "Qualidade significa fazer o certo quando ninguém está olhando.", author: "Henry Ford" },
  { text: "Não conte os dias, faça os dias contarem.", author: "Muhammad Ali" }
];

export default function BentoWelcome({ userName }: BentoWelcomeProps) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // 1. Obter a frase estável baseada no dia do ano
  const getFraseDoDia = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return FRASES_MOTIVACIONAIS[dayOfYear % FRASES_MOTIVACIONAIS.length];
  };

  const frase = getFraseDoDia();

  // 2. Buscar Clima Dinâmico do Backend (API OpenWeather)
  useEffect(() => {
    setLoadingWeather(true);
    // Vercel rewrite ou local Express handler
    fetch('/api/system_handler?action=weather&city=Joinville')
      .then(res => {
        if (!res.ok) throw new Error('Falha ao buscar clima');
        return res.json();
      })
      .then(data => {
        if (data.main && data.weather && data.weather[0]) {
          setWeather({
            temp: Math.round(data.main.temp),
            desc: data.weather[0].description,
            city: data.name
          });
        }
        setLoadingWeather(false);
      })
      .catch(err => {
        console.log('[BentoWelcome] Clima com chave não configurada ou erro. Usando fallback discreto.');
        // Fallback silencioso (Joinville padrão)
        setWeather({
          temp: 22,
          desc: 'Parcialmente Nublado',
          city: 'Joinville'
        });
        setLoadingWeather(false);
      });
  }, []);

  return (
    <div className="h-full min-h-[420px] bg-gradient-to-br from-primary-500/10 to-violet-500/10 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between text-left group hover:border-primary-500/20 transition-all duration-300">
      
      {/* Bloco Superior: Saudação e Data */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-400 text-xs font-black uppercase tracking-wider">
            <CloudSun size={14} className="animate-pulse" />
            <span>Café Matinal</span>
          </div>
          
          {/* Clima real dinâmico */}
          {loadingWeather ? (
            <Loader2 className="animate-spin text-gray-500" size={12} />
          ) : weather ? (
            <span className="text-[10px] text-gray-400 font-bold bg-white/5 border border-white/5 px-2 py-1 rounded-lg capitalize">
              ☁️ {weather.city}: {weather.temp}°C, {weather.desc}
            </span>
          ) : null}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-white leading-tight">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-violet-400">{userName}</span>! ☕
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 capitalize">
            <Calendar size={10} className="text-violet-400/70" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Bloco Central: Frase Motivacional (Foco e Inspiração) */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
        <p className="text-xs italic text-gray-300 leading-relaxed font-medium">
          "{frase.text}"
        </p>
        <p className="text-[9px] text-primary-400 font-black uppercase tracking-wider text-right">
          — {frase.author}
        </p>
      </div>

      {/* Bloco Inferior: Atalhos Rápidos da Equipe */}
      <div className="space-y-3 pt-2">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Atalhos Rápidos</h4>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white"
          >
            <FileSpreadsheet size={14} className="text-emerald-400" />
            Google Drive
          </a>
          <a
            href="https://notion.so"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white"
          >
            <FolderKanban size={14} className="text-violet-400" />
            Notion Wiki
          </a>
          <a
            href="https://canva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white"
          >
            <Palette size={14} className="text-primary-400" />
            Canva Design
          </a>
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 bg-black/30 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white"
          >
            <MessageCircle size={14} className="text-blue-400" />
            WhatsApp Web
          </a>
        </div>
      </div>

    </div>
  );
}
