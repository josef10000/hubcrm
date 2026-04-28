import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Edit2, ExternalLink, Plus, Quote, StickyNote, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MyCornerWidget() {
  const { userProfile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [phrase, setPhrase] = useState(userProfile?.myCorner?.phrase || '');
  const [notes, setNotes] = useState(userProfile?.myCorner?.notes || '');
  const [links, setLinks] = useState<{title: string, url: string}[]>(userProfile?.myCorner?.links || []);
  
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const handleAddLink = () => {
    if (newLinkTitle && newLinkUrl) {
      let formattedUrl = newLinkUrl;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      setLinks([...links, { title: newLinkTitle, url: formattedUrl }]);
      setNewLinkTitle('');
      setNewLinkUrl('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        myCorner: { phrase, notes, links }
      }, { merge: true });
      toast.success('Seu cantinho foi salvo!');
      setIsEditing(false);
    } catch (e) {
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
          <button onClick={() => setIsEditing(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <Edit2 size={16} />
          </button>
        ) : (
          <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-bold">
            <Save size={16} /> Salvar
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
             {phrase ? (
               <div className="flex gap-3">
                 <Quote className="text-primary-500/50 shrink-0" size={24} />
                 <p className="text-gray-600 dark:text-gray-300 italic font-medium">"{phrase}"</p>
               </div>
             ) : (
               <p className="text-gray-500 italic text-sm">Nenhuma frase definida.</p>
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
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Frase do Dia</label>
            <input type="text" value={phrase} onChange={e => setPhrase(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 text-sm" placeholder="O que te inspira hoje?" />
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
              <button onClick={handleAddLink} className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-xl text-gray-900 dark:text-white"><Plus size={16}/></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                  {link.title}
                  <button onClick={() => handleRemoveLink(i)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
