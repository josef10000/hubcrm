import { User, Globe, Users } from 'lucide-react';

interface MentionSuggestionsProps {
  query: string;
  members: Array<{ uid: string; displayName: string; photoURL?: string }>;
  roles?: Array<{ id: string; name: string }>;
  onSelect: (item: { uid: string; displayName: string; isRole?: boolean }) => void;
  onClose: () => void;
}

export default function MentionSuggestions({ query, members, roles = [], onSelect, onClose }: MentionSuggestionsProps) {
  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  // Se não houver query, mostrar os primeiros ou @todos
  const results = [
    { uid: 'all', displayName: 'todos', isSpecial: true },
    ...filteredRoles.map(r => ({ uid: r.id, displayName: r.name, isRole: true })),
    ...filteredMembers.map(m => ({ uid: m.uid, displayName: m.displayName, photoURL: m.photoURL }))
  ];

  if (results.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
      <div className="p-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mencionar Alguém</span>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {results.map((item: any) => (
          <button
            key={item.uid}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 p-3 hover:bg-primary-500 hover:text-white transition-all group border-b border-gray-50 dark:border-white/5 last:border-0"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              item.uid === 'all' 
                ? 'bg-amber-500/10 text-amber-600 group-hover:bg-white/20 group-hover:text-white' 
                : item.isRole
                  ? 'bg-primary-500/10 text-primary-600 group-hover:bg-white/20 group-hover:text-white'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-400 group-hover:bg-white/20 group-hover:text-white'
            }`}>
              {item.uid === 'all' ? <Globe size={16} /> : item.isRole ? <Users size={16} /> : <User size={16} />}
            </div>
            <div className="text-left">
              <span className="text-sm font-bold block leading-none mb-1">
                {item.uid === 'all' ? '@todos' : `@${item.displayName}`}
              </span>
              <span className="text-[10px] opacity-60 uppercase tracking-tighter font-medium">
                {item.uid === 'all' ? 'Notificar o grupo inteiro' : item.isRole ? 'Mencionar Cargo/Time' : 'Membro da Equipe'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
