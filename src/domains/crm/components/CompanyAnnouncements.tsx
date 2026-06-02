import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { useCRMStore } from '@store/useCRMStore';
import { Megaphone, Loader2 } from 'lucide-react';

interface Announcement {
  id?: string;
  title: string;
  content: string;
  author: string;
  createdAt: number;
  expiresAt: number;
  urgent: boolean;
}

export default function CompanyAnnouncements() {
  const effectiveOrgId = useCRMStore(state => state.effectiveOrgId);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveOrgId) return;

    setLoading(true);
    const ref = collection(db, 'organizations', effectiveOrgId, 'announcements');
    const q = query(ref);

    const unsubscribe = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      // Filtrar somente avisos que ainda não expiraram
      const now = Date.now();
      const activeList = list.filter(ann => ann.expiresAt > now);

      // Ordenar por criação (mais recente primeiro)
      activeList.sort((a, b) => b.createdAt - a.createdAt);
      setAnnouncements(activeList);
      setLoading(false);

      // Se a coleção estiver vazia, cria os comunicados de semente (seeding) iniciais
      if (list.length === 0) {
        try {
          const mockAnnouncements = [
            {
              title: '[AVISO] Novo Painel Matinal no Ar',
              content: 'A partir de hoje, a tela de entrada do CRM foi atualizada para trazer notícias de economia, tech, cotações financeiras e a lista matinal de animes para começarmos o dia integrados e bem informados! O ponto eletrônico e as metas continuam disponíveis em seus respectivos submenus.',
              author: 'Diretoria / RH',
              createdAt: Date.now(),
              expiresAt: Date.now() + 15 * 24 * 60 * 60 * 1000, // Ativo por 15 dias
              urgent: true
            },
            {
              title: 'Aprovação de Proventos e Benefícios',
              content: 'Prestadores de serviços PJ e CLT: lembrem-se de verificar suas notas e recibos na aba financeira estratégica antes do dia 05 para garantir o processamento correto dos pagamentos via Asaas.',
              author: 'Financeiro',
              createdAt: Date.now() - 12 * 60 * 60 * 1000,
              expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000, // Ativo por 10 dias
              urgent: false
            }
          ];

          for (const mock of mockAnnouncements) {
            const seedId = 'seed_' + Math.random().toString(36).substring(7);
            await setDoc(doc(db, 'organizations', effectiveOrgId, 'announcements', seedId), mock);
          }
        } catch (e) {
          // Ignora erro de permissão para colaboradores comuns
          console.log('[CompanyAnnouncements] Silenced write error on seeding:', e);
        }
      }
    }, (err) => {
      console.error('[CompanyAnnouncements] Erro ao ouvir comunicados:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [effectiveOrgId]);

  if (loading) {
    return (
      <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-center min-h-[220px]">
        <Loader2 className="animate-spin text-primary-500 mr-2" />
        <span className="text-sm text-gray-500">Carregando mural...</span>
      </div>
    );
  }

  return (
    <div className="bg-black/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl space-y-4 text-left h-full min-h-[220px]">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
        <Megaphone size={14} className="text-amber-500" />
        Mural de Comunicados
      </h3>

      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
        {announcements.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-8 text-center">Nenhum aviso importante no ar no momento.</p>
        ) : (
          announcements.map((ann) => (
            <div 
              key={ann.id} 
              className={`p-4 rounded-2xl relative overflow-hidden transition-all duration-300 ${
                ann.urgent 
                  ? 'bg-amber-500/5 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.03)]' 
                  : 'bg-white/[0.01] hover:bg-white/[0.03] border border-white/5'
              }`}
            >
              {ann.urgent && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-[8px] font-black uppercase tracking-wider ${
                  ann.urgent ? 'text-amber-400' : 'text-gray-500'
                }`}>
                  {ann.author}
                </span>
                <span className="text-[8px] text-gray-500 font-bold">
                  {new Date(ann.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {ann.title}
              </h4>
              <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed whitespace-pre-line">
                {ann.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
