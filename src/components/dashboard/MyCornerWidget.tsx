import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Edit2, ExternalLink, Plus, Quote, StickyNote, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MyCornerWidget() {
  const { userProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [dailyQuote, setDailyQuote] = useState<{content: string, author: string} | null>(null);
  const [notes, setNotes] = useState(userProfile?.myCorner?.notes || '');
  const [links, setLinks] = useState<{title: string, url: string}[]>(userProfile?.myCorner?.links || []);
  
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Biblioteca interna de frases premium em Português (Fallback determinístico)
  const MOTIVATIONAL_QUOTES = [
    { content: "O sucesso não é o final, o fracasso não é fatal: é a coragem de continuar que conta.", author: "Winston Churchill" },
    { content: "Acredite que você pode e você estará no meio do caminho.", author: "Theodore Roosevelt" },
    { content: "Sua limitação — é apenas sua imaginação.", author: "Autor Desconhecido" },
    { content: "Trabalhe duro em silêncio, deixe seu sucesso ser seu barulho.", author: "Frank Ocean" },
    { content: "Às vezes o 'depois' se torna 'nunca'. Faça agora.", author: "Autor Desconhecido" },
    { content: "Grandes coisas nunca vieram de zonas de conforto.", author: "Autor Desconhecido" },
    { content: "Sonhe alto. Comece pequeno. Mas, acima de tudo, comece.", author: "Simon Sinek" },
    { content: "Não pare quando estiver cansado. Pare quando tiver terminado.", author: "Autor Desconhecido" },
    { content: "Vai ser difícil, mas difícil não significa impossível.", author: "Autor Desconhecido" },
    { content: "Não espere por oportunidades. Crie-as.", author: "Autor Desconhecido" },
    { content: "O sucesso não te encontra. Você tem que sair e pegá-lo.", author: "Autor Desconhecido" },
    { content: "A chave para o sucesso é focar em metas, não em obstáculos.", author: "Autor Desconhecido" },
    { content: "A disciplina é fazer o que precisa ser feito, mesmo que você não queira.", author: "Autor Desconhecido" },
    { content: "Sua única competição é quem você era ontem.", author: "Autor Desconhecido" },
    { content: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
    { content: "O melhor momento para plantar uma árvore foi há 20 anos. O segundo melhor é agora.", author: "Provérbio Chinês" },
    { content: "O que você faz hoje pode melhorar todos os seus amanhãs.", author: "Ralph Marston" },
    { content: "Não conte os dias, faça os dias contarem.", author: "Muhammad Ali" },
    { content: "A coragem não é a ausência de medo, mas o triunfo sobre ele.", author: "Nelson Mandela" },
    { content: "Se você quer algo que nunca teve, precisa fazer algo que nunca fez.", author: "Thomas Jefferson" }
  ];

  // Lógica para frase do dia (Diferente por pessoa, fixa por dia)
  React.useEffect(() => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD (Estável)
    const storageKey = `hub_daily_quote_v2_${user.uid}`; // Versão 2 para invalidar cache antigo
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.date === today) {
          setDailyQuote(data.quote);
          return;
        }
      } catch (e) {
        console.error('Erro ao ler cache de frase:', e);
      }
    }

    const fetchQuote = async () => {
      try {
        // Tentamos uma API estável (ZenQuotes via Proxy para evitar CORS e instabilidade)
        const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://zenquotes.io/api/random'));
        if (!response.ok) throw new Error('API Offline');
        
        const wrapper = await response.json();
        const data = JSON.parse(wrapper.contents);
        
        if (data && data[0]) {
          const quoteObj = { 
            content: data[0].q, 
            author: data[0].a 
          };
          setDailyQuote(quoteObj);
          localStorage.setItem(storageKey, JSON.stringify({ date: today, quote: quoteObj }));
          return;
        }
        throw new Error('Formato inválido');
      } catch (error) {
        console.warn('Usando biblioteca interna de frases (API Offline/Injetada):', error);
        
        // Algoritmo Determinístico: Usa a data e o UID do usuário para escolher uma frase da lista
        // Isso garante que cada usuário tenha uma frase diferente, mas fixa para aquele dia
        const seed = today.replace(/-/g, '') + user.uid.substring(0, 4);
        const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % MOTIVATIONAL_QUOTES.length;
        
        const fallbackQuote = MOTIVATIONAL_QUOTES[index];
        setDailyQuote(fallbackQuote);
        
        // Salva o fallback no cache também para evitar re-fetch inútil no mesmo dia
        localStorage.setItem(storageKey, JSON.stringify({ date: today, quote: fallbackQuote }));
      }
    };

    fetchQuote();
  }, [user]);

  const handleAddLink = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (newLinkTitle && newLinkUrl) {
      let formattedUrl = newLinkUrl;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      setLinks([...links, { title: newLinkTitle, url: formattedUrl }]);
      setNewLinkTitle('');
      setNewLinkUrl('');
    } else {
      toast.error('Preencha título e URL para adicionar o link.');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        myCorner: { notes, links }
      }, { merge: true });
      toast.success('Seu cantinho foi salvo!');
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar as configurações.');
    }
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg mb-8 relative group overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-500"></div>
      
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          ☕ Meu Canto
        </h3>
        {!isEditing ? (
          <button type="button" onClick={() => setIsEditing(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <Edit2 size={16} />
          </button>
        ) : (
          <button type="button" onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-bold">
            <Save size={16} /> Salvar
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
             {dailyQuote ? (
               <div className="flex flex-col gap-2">
                 <div className="flex gap-3">
                   <Quote className="text-primary-500/50 shrink-0" size={20} />
                   <p className="text-gray-600 dark:text-gray-300 italic font-medium leading-relaxed">"{dailyQuote.content}"</p>
                 </div>
                 <span className="text-[10px] font-bold text-primary-500/70 uppercase tracking-widest text-right">— {dailyQuote.author}</span>
               </div>
             ) : (
               <div className="animate-pulse space-y-2">
                 <div className="h-4 bg-white/5 rounded w-full"></div>
                 <div className="h-4 bg-white/5 rounded w-3/4"></div>
               </div>
             )}
             
             <div className="pt-4 border-t border-gray-200 dark:border-white/5">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2"><ExternalLink size={14}/> Links Rápidos</h4>
                <div className="flex flex-wrap gap-2">
                  {links.length > 0 ? links.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      {link.title} <ExternalLink size={10} className="opacity-50" />
                    </a>
                  )) : (
                    <span className="text-xs text-gray-500">Nenhum link adicionado.</span>
                  )}
                </div>
             </div>
          </div>
          <div className="md:col-span-2">
            <div className="bg-[#fff9c4] dark:bg-[#fff9c4]/10 rounded-2xl p-5 min-h-[140px] shadow-inner border border-yellow-200/20">
               <h4 className="text-xs font-bold text-yellow-800 dark:text-yellow-200/70 mb-3 flex items-center gap-2 uppercase tracking-wider"><StickyNote size={14}/> Notas (Apenas para você)</h4>
               <p className="text-yellow-900 dark:text-yellow-100/90 whitespace-pre-wrap text-sm leading-relaxed">{notes || 'Suas anotações aparecerão aqui...'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-xl">
            <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">Frase Dinâmica Ativada</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">A frase do dia agora é automática e inspiracional. Cada colega recebe uma dose única de motivação a cada 24 horas.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Anotações Privadas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 text-sm custom-scrollbar" placeholder="Escreva o que não quer esquecer..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Links Rápidos</label>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} placeholder="Título (ex: Spotify)" className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-gray-900 dark:text-white text-sm" />
              <input type="text" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL" className="flex-1 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-gray-900 dark:text-white text-sm" />
              <button type="button" onClick={handleAddLink} className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl text-gray-900 dark:text-white"><Plus size={16}/></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                  {link.title}
                  <button type="button" onClick={() => handleRemoveLink(i)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
