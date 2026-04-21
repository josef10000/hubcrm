import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { toast } from 'sonner';
import { Send, CheckSquare, Square, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface BroadcastTabProps {
  teamMembers: UserProfile[];
}

export default function BroadcastTab({ teamMembers }: BroadcastTabProps) {
  const { userProfile, user } = useAuth();
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [hasButton, setHasButton] = useState(false);
  const [buttonUrl, setButtonUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Filtros Básicos
  const [roleFilter, setRoleFilter] = useState<string>('todos');

  const roles = Array.from(new Set(teamMembers.map(m => typeof m.role === 'string' ? m.role : m.role.id)));

  const filteredMembers = teamMembers.filter(m => {
    const roleId = typeof m.role === 'string' ? m.role : m.role.id;
    if (roleFilter !== 'todos' && roleId !== roleFilter) return false;
    return true;
  });

  const toggleAll = () => {
    if (selectedUids.length === filteredMembers.length) {
      // Se todos estiverem selecionados, limpa
      setSelectedUids([]);
    } else {
      // Se não, seleciona todos os filtrados
      setSelectedUids(filteredMembers.map(m => m.uid));
    }
  };

  const toggleMember = (uid: string) => {
    if (selectedUids.includes(uid)) {
      setSelectedUids(prev => prev.filter(id => id !== uid));
    } else {
      setSelectedUids(prev => [...prev, uid]);
    }
  };

  const handleSend = async () => {
    if (selectedUids.length === 0) {
      toast.error('Selecione pelo menos um destinatário.');
      return;
    }
    if (hasButton && !buttonUrl.trim()) {
      toast.error('Preencha a URL do botão ou desmarque a opção.');
      return;
    }

    setIsSending(true);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Não autenticado');

      const response = await fetch('/api/team_handler?action=broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uids: selectedUids,
          hasButton,
          buttonUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao disparar broadcast');
      }

      toast.success('Comunicados disparados com sucesso!');
      
      // Clear form
      setHasButton(false);
      setButtonUrl('');
      setSelectedUids([]);
      
    } catch (error: any) {
      console.error('Erro no broadcast:', error);
      toast.error(error.message || 'Falha ao conectar no servidor.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Container Principal: Dividido em Lado Esquerdo (Filtros e Cards) e Lado Direito (Formulário) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Lado Esquerdo: Seleção de Destinatários */}
        <div className="xl:col-span-7 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-500 max-h-[800px] overflow-hidden flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h3 className="font-bold flex items-center gap-2 text-xl">
                <Users className="text-blue-500" />
                Destinatários
              </h3>
              <p className="text-sm text-gray-500">Selecione quem receberá o comunicado.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm"
              >
                <option value="todos">Todos os Cargos</option>
                {roles.map(rId => {
                  const roleObj = teamMembers.find(m => (typeof m.role === 'string' ? m.role : m.role.id) === rId)?.role;
                  const roleName = typeof roleObj === 'string' ? roleObj : roleObj?.name || rId;
                  return <option key={rId} value={rId}>{roleName}</option>;
                })}
              </select>
              <button 
                onClick={toggleAll}
                className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium rounded-xl text-sm transition-colors"
              >
                {selectedUids.length === filteredMembers.length && filteredMembers.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          {/* Grid de Membros */}
          <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
              {filteredMembers.map(member => {
                const isSelected = selectedUids.includes(member.uid);
                
                return (
                  <div 
                    key={member.uid}
                    onClick={() => toggleMember(member.uid)}
                    className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${isSelected ? 'bg-blue-500/10 border-blue-500 dark:border-blue-500/50 shadow-sm' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    {/* Checkbox Icon */}
                    <div className="absolute top-2 right-2 text-gray-400">
                      {isSelected ? <CheckSquare className="text-blue-500" size={18} /> : <Square size={18} />}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold">{member.displayName[0]}</span>
                      )}
                    </div>
                    <div className="overflow-hidden pr-6">
                      <p className="font-bold text-sm truncate">{member.displayName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{member.jobTitle || (typeof member.role === 'string' ? member.role : member.role?.name)}</p>
                    </div>
                  </div>
                );
              })}

              {filteredMembers.length === 0 && (
                <div className="col-span-full py-10 text-center text-gray-400">
                  Nenhum colaborador encontrado neste filtro.
                </div>
              )}
            </div>
          </div>
          
          {/* Footer of Left Side */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
            <span className="text-sm font-medium">
              <span className="text-blue-500 font-bold">{selectedUids.length}</span> colaboradores selecionados
            </span>
          </div>
        </div>

        {/* Lado Direito: Formulário e Disparo */}
        <div className="xl:col-span-5 bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl animate-in fade-in duration-700">
          <div className="mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
             <h3 className="font-bold flex items-center gap-2 text-xl">
                <MessageSquare className="text-primary-500" />
                Mensagem
             </h3>
             <p className="text-sm text-gray-500">Configure o visual e o texto do comunicado.</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setHasButton(!hasButton)}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${hasButton ? 'bg-primary-500 border-primary-500' : 'bg-transparent border-gray-300 dark:border-white/30'}`}>
                  {hasButton && <CheckSquare className="text-white w-4 h-4" />}
                </div>
                <span className="font-medium text-sm">Enviar modelo de Comunicado com Link/Botão</span>
              </div>

              {hasButton && (
                <div className="mt-4 animate-in slide-in-from-top-2">
                  <label className="block text-xs text-gray-500 mb-1">URL (Para onde o botão vai redirecionar)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={buttonUrl}
                    onChange={e => setButtonUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-primary-500 transition-all"
                  />
                  <div className="mt-2 flex items-start gap-2 text-[11px] text-gray-500">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-500" />
                    <p>Você gerencia os textos diretos e o layout do e-mail nas configurações do template lá no <b>Resend</b>. Aqui, apenas enviamos a URL que o botão usará.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={isSending || selectedUids.length === 0}
              className="w-full mt-6 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary-600 to-purple-600 hover:scale-[1.02]"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
              {isSending ? 'Enviando...' : `Disparar para ${selectedUids.length} colaborador${selectedUids.length === 1 ? '' : 'es'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
